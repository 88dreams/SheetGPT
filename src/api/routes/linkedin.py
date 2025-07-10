"""
LinkedIn integration API routes.
"""
import logging
import secrets
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from starlette.status import HTTP_401_UNAUTHORIZED, HTTP_403_FORBIDDEN, HTTP_404_NOT_FOUND
from uuid import UUID

from ...schemas.linkedin import (
    LinkedInStatusResponse,
    BrandConnectionResponse,
    LinkedInAccountForBackgroundTask
)

from ...services.linkedin.linkedin_service import LinkedInService, LinkedInClient
from ...services.linkedin.connection_service import ConnectionService

from ...models.linkedin import LinkedInAccount
from ...utils.database import get_db
from ...utils.security import (
    get_current_user_id,
    generate_secure_state,
    extract_user_id_from_state
)


logger = logging.getLogger(__name__)
# Don't add the prefix here since it's already added in the api.py include_router call
router = APIRouter(tags=["linkedin"])


async def process_linkedin_connections(
    account_id: int,
    db: AsyncSession
) -> None:
    """
    Background task to fetch and process LinkedIn connections.
    
    Args:
        account_id: The ID of the LinkedIn account
        db: Database session
    """
    try:
        # Get LinkedIn account using raw SQL to avoid async issues
        from sqlalchemy import text
        account_query = await db.execute(text(f"SELECT * FROM linkedin_accounts WHERE id = {account_id}"))
        account_data = account_query.first()
        
        if not account_data:
            logger.error(f"LinkedIn account {account_id} not found")
            return
            
        account = LinkedInAccountForBackgroundTask(
            id=account_data[0],
            user_id=account_data[1],
            linkedin_id=account_data[2],
            access_token=account_data[3],
            refresh_token=account_data[4],
            expires_at=account_data[5],
            last_synced=account_data[6],
            created_at=account_data[7],
            updated_at=account_data[8]
        )
        
        if not account:
            logger.error(f"LinkedIn account {account_id} not found")
            return
            
        # Get LinkedIn client
        linkedin_service = LinkedInService(db)
        client = await linkedin_service.get_client_for_user(str(account.user_id))
        if not client:
            logger.error(f"Failed to create LinkedIn client for user {account.user_id}")
            return
            
        async with client as session:
            # Get user's profile
            try:
                profile = await session.get_profile()
                logger.info(f"Retrieved LinkedIn profile for user {account.user_id}")
            except Exception as e:
                logger.error(f"Error retrieving LinkedIn profile: {str(e)}")
                return
                
            # Get connections (this may fail depending on permissions, but we handle that gracefully now)
            try:
                connections = await session.get_connections()
                element_count = len(connections.get('elements', []))
                logger.info(f"Retrieved {element_count} LinkedIn connections")
                
                # Only try to save connections if we got some
                if element_count > 0:
                    # Save connections
                    connection_service = ConnectionService(db)
                    saved_count = await connection_service.save_connections(
                        user_id=account.user_id,
                        connections=connections.get('elements', []),
                        connection_degree=1
                    )
                    logger.info(f"Saved {saved_count} LinkedIn connections to database")
                else:
                    logger.warning("No LinkedIn connections returned from API (possibly due to permission limitations)")
            except Exception as e:
                logger.error(f"Error retrieving or saving LinkedIn connections: {str(e)}")
                
            # Match connections to brands (still try even if connections retrieval failed)
            try:
                # We'll use the updated async-compatible method
                from sqlalchemy import text
                logger.info("Starting brand matching process")
                
                # Create connection service if it doesn't exist yet
                if 'connection_service' not in locals():
                    connection_service = ConnectionService(db)
                
                # Match any connections we have to brands
                stats = await connection_service.match_connections_to_brands(account.user_id)
                logger.info(f"Connection matching stats: {stats}")
            except Exception as e:
                logger.error(f"Error matching connections to brands: {str(e)}")
                # Log the full error details for debugging
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                
        # Update last synced time with direct SQL
        now = datetime.now().isoformat()
        await db.execute(text(f"UPDATE linkedin_accounts SET last_synced = '{now}' WHERE id = {account.id}"))
        await db.commit()
        logger.info(f"Updated last_synced for account {account.id}")
    except Exception as e:
        logger.error(f"Error processing LinkedIn connections: {str(e)}")


async def get_user_from_token_param(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[UUID]:
    """Get user ID from access_token query parameter."""
    from jose import jwt, JWTError
    from src.core.config import settings
    
    access_token = request.query_params.get("access_token")
    if not access_token:
        return None
        
    try:
        payload = jwt.decode(
            access_token,
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )
        user_id = payload.get("sub")
        if user_id:
            # Verify user exists in database
            from src.models.models import User
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                return UUID(user_id)
    except (JWTError, ValueError) as e:
        logger.error(f"Error decoding token from query param: {str(e)}")
        
    return None

@router.get("/auth")
async def initiate_linkedin_auth(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Initiate LinkedIn OAuth flow using r_liteprofile scope.
    This is the standard scope for basic LinkedIn profile access.
    """
    logger.info("============= LinkedIn auth: Standard OAuth flow =============")
    
    # Standard OAuth flow for production
    # Get user ID from authorization header for embedding in state
    user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            from jose import jwt
            from src.core.config import settings
            
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("sub")
            if user_id:
                request.session["user_id"] = user_id
                logger.info(f"Extracted and stored user_id in session for OAuth flow: {user_id}")
        except Exception as e:
            logger.error(f"Error extracting user ID from token: {str(e)}")
    
    # If no user ID from token, try from session
    if not user_id and "user_id" in request.session:
        user_id = request.session["user_id"]
        logger.info(f"Using existing user_id from session for OAuth flow: {user_id}")
    
    # If still no user ID, try to get from DB as last resort
    if not user_id:
        try:
            from src.models.models import User
            from sqlalchemy import select
            
            # Use AsyncSession properly with execute
            result = await db.execute(select(User).limit(1))
            first_user = result.scalars().first()
            
            if first_user:
                user_id = str(first_user.id)
                request.session["user_id"] = user_id
                logger.info(f"Using first user ID from database for OAuth flow: {user_id}")
        except Exception as e:
            logger.error(f"Error getting user from DB: {str(e)}")
    
    # Generate secure state with user ID embedded if available
    from ...utils.security import generate_secure_state
    state = generate_secure_state(user_id) if user_id else secrets.token_hex(16)
    
    # Store state in session
    request.session["linkedin_oauth_state"] = state
    logger.info(f"Generated and stored state: {state[:10]}... (truncated)")
    
    try:
        # When running in local development, always use localhost:8000 with http
        # This must match exactly what's registered in LinkedIn Developer Portal
        host = "localhost:8000" 
        scheme = "http"  # Force http for local development
        
        # Construct full callback URL - this must match exactly what's registered in LinkedIn app settings
        redirect_uri = f"{scheme}://{host}/api/v1/linkedin/callback"
        logger.info(f"Redirect URI: {redirect_uri}")
        
        # Standard LinkedIn API scope for basic profile
        from src.core.config import settings
        
        import urllib.parse
        # Use the OpenID Connect scopes as required by LinkedIn
        params = {
            "response_type": "code",
            "client_id": settings.LINKEDIN_CLIENT_ID,  # Use from settings
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "openid profile email"  # OpenID Connect scopes
        }
        logger.info(f"Using LinkedIn scopes: openid profile email")
        
        # Log settings to verify
        logger.info(f"Using LinkedIn Client ID: {settings.LINKEDIN_CLIENT_ID}")
        logger.info(f"Using LinkedIn Client Secret: {'*****' + settings.LINKEDIN_CLIENT_SECRET[-5:] if settings.LINKEDIN_CLIENT_SECRET else 'Not Set'}")
        
        # Create URL with standard scope
        query_string = "&".join(f"{key}={urllib.parse.quote(str(value))}" for key, value in params.items())
        auth_url = f"https://www.linkedin.com/oauth/v2/authorization?{query_string}"
        logger.info(f"Generated LinkedIn auth URL: {auth_url[:50]}...")
        
        # Redirect to LinkedIn
        return RedirectResponse(auth_url)
    except Exception as e:
        logger.error(f"LinkedIn auth error: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return RedirectResponse(url=f"http://localhost:5173/sheetgpt/settings?linkedin=oauth_error&message={urllib.parse.quote(str(e))}")


@router.get("/auth_alt")
async def initiate_linkedin_auth_alternative(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Alternative LinkedIn OAuth flow using standard LinkedIn scopes.
    This method tries the standard LinkedIn API scopes instead of OpenID.
    """
    logger.info("============= LinkedIn auth: Standard LinkedIn API scopes =============")
    
    # Generate random state for CSRF protection
    import secrets
    state = secrets.token_hex(16)
    
    # Store state in session
    request.session["linkedin_oauth_state"] = state
    logger.info(f"Generated and stored state (standard scopes): {state}")
    
    try:
        # Get hostname from request or default to localhost
        host = request.headers.get("host", "localhost:8000")
        # Use https for production, http for local development
        scheme = "https" if "localhost" not in host and "127.0.0.1" not in host else "http"
        
        # Construct full callback URL with host information from the request
        redirect_uri = f"{scheme}://{host}/api/v1/linkedin/callback"
        logger.info(f"Standard scopes redirect URI: {redirect_uri}")
        
        # Use standard LinkedIn API scopes
        import urllib.parse
        # Use settings from config
        from src.core.config import settings
        
        params = {
            "response_type": "code",
            "client_id": settings.LINKEDIN_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "openid profile email"  # Use OpenID Connect scopes that are authorized for the app
        }
        
        # Create URL with standard scopes
        query_string = "&".join(f"{key}={urllib.parse.quote(str(value))}" for key, value in params.items())
        auth_url = f"https://www.linkedin.com/oauth/v2/authorization?{query_string}"
        logger.info(f"Generated LinkedIn auth URL (standard scopes): {auth_url[:50]}...")
        
        # Redirect to LinkedIn
        return RedirectResponse(auth_url)
    except Exception as e:
        logger.error(f"LinkedIn auth error (standard scopes): {str(e)}")
        return RedirectResponse(url=f"http://localhost:5173/sheetgpt/settings?linkedin=oauth_error&message={str(e)}")


@router.get("/auth_minimal")
async def initiate_linkedin_auth_minimal(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Minimal LinkedIn OAuth flow with just one basic scope.
    This is a last resort option when the app has minimal permissions.
    """
    logger.info("============= LinkedIn auth: Minimal scope approach =============")
    
    # Generate random state for CSRF protection
    import secrets
    state = secrets.token_hex(16)
    
    # Store state in session
    request.session["linkedin_oauth_state"] = state
    logger.info(f"Generated and stored state (minimal): {state}")
    
    try:
        # Get hostname from request or default to localhost
        host = request.headers.get("host", "localhost:8000")
        # Use https for production, http for local development
        scheme = "https" if "localhost" not in host and "127.0.0.1" not in host else "http"
        
        # Construct full callback URL with host information from the request
        redirect_uri = f"{scheme}://{host}/api/v1/linkedin/callback"
        logger.info(f"Minimal scope redirect URI: {redirect_uri}")
        
        # Use just one minimal scope
        import urllib.parse
        # Use settings from config
        from src.core.config import settings
        
        params = {
            "response_type": "code",
            "client_id": settings.LINKEDIN_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "openid profile email"  # Use OpenID Connect scopes that are authorized for the app
        }
        
        # Create URL with minimal scope
        query_string = "&".join(f"{key}={urllib.parse.quote(str(value))}" for key, value in params.items())
        auth_url = f"https://www.linkedin.com/oauth/v2/authorization?{query_string}"
        logger.info(f"Generated LinkedIn auth URL (minimal): {auth_url[:50]}...")
        
        # Redirect to LinkedIn
        return RedirectResponse(auth_url)
    except Exception as e:
        logger.error(f"LinkedIn auth error (minimal): {str(e)}")
        return RedirectResponse(url=f"http://localhost:5173/sheetgpt/settings?linkedin=oauth_error&message={str(e)}")


@router.get("/dev_mode")
async def initiate_linkedin_auth_dev_mode(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Development mode LinkedIn auth that bypasses the actual LinkedIn OAuth flow.
    This creates a mock connection for testing purposes only.
    
    CRITICAL: This should be disabled or removed in production.
    """
    logger.warning("⚠️ SECURITY WARNING: Using development mode LinkedIn auth (bypasses real OAuth)")
    
    try:
        # Manually import SQLAlchemy models and session to avoid async issues
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy import create_engine
        from src.utils.database import SQLALCHEMY_DATABASE_URL
        from src.models.models import User
        from src.models.linkedin import LinkedInAccount
        
        # Create a direct synchronous database connection for this operation
        logger.info("Creating direct database connection for dev mode")
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        direct_db = SessionLocal()
        
        try:
            # Get first user from database 
            logger.info("Querying for first user with direct session")
            first_user = direct_db.query(User).first()
            
            if not first_user:
                logger.error("No users found in database for development mode auth")
                return RedirectResponse(url="http://localhost:5173/sheetgpt/settings?linkedin=no_users_in_database")
                
            user_id = str(first_user.id)
            logger.info(f"Found user for development mode: {user_id} | {first_user.email}")
            
            # Create a mock LinkedIn account using direct session
            mock_linkedin_id = f"dev_user_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            logger.info(f"Creating mock LinkedIn account with ID: {mock_linkedin_id}")
            
            # Check if user already has an account
            existing = direct_db.query(LinkedInAccount).filter(
                LinkedInAccount.user_id == user_id
            ).first()
            
            if existing:
                # Update existing account
                logger.info(f"Updating existing LinkedIn account: {existing.id}")
                existing.linkedin_id = mock_linkedin_id
                existing.access_token = "dev_mode_access_token_12345"
                existing.refresh_token = "dev_mode_refresh_token_12345"
                existing.expires_at = datetime.now() + timedelta(hours=1)
                existing.updated_at = datetime.now()
                direct_db.commit()
                direct_db.refresh(existing)
                account_id = existing.id
            else:
                # Create new account
                logger.info("Creating new LinkedIn account")
                new_account = LinkedInAccount(
                    user_id=UUID(user_id),
                    linkedin_id=mock_linkedin_id,
                    access_token="dev_mode_access_token_12345",
                    refresh_token="dev_mode_refresh_token_12345",
                    expires_at=datetime.now() + timedelta(hours=1)
                )
                direct_db.add(new_account)
                direct_db.commit()
                direct_db.refresh(new_account)
                account_id = new_account.id
                
            logger.info(f"Successfully created/updated mock LinkedIn account: {account_id}")
            
            # Return success
            return RedirectResponse(url="http://localhost:5173/sheetgpt/settings?linkedin=connected&mode=development")
        finally:
            # Always close the direct database session
            direct_db.close()
            
    except Exception as e:
        logger.error(f"Error in development mode auth: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return RedirectResponse(url=f"http://localhost:5173/sheetgpt/settings?linkedin=error&message={str(e)}")


@router.get("/callback")
async def linkedin_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    """
    Handle LinkedIn OAuth callback with simplified approach.
    """
    logger.info("============= LinkedIn callback: Endpoint called =============")
    logger.info(f"Headers: {dict(request.headers)}")
    logger.info(f"Query params: {dict(request.query_params)}")
    logger.info(f"Session: {dict(request.session)}")
    
    # Check for error param from LinkedIn
    error = request.query_params.get("error")
    error_description = request.query_params.get("error_description")
    
    if error:
        # Log the error with detailed information
        logger.error(f"LinkedIn OAuth error: {error} - {error_description}")
        
        # Handle specific errors with appropriate redirects to alternative authentication methods
        if error == "unauthorized_scope_error":
            logger.error("Scope not authorized. Trying alternative standard LinkedIn scopes...")
            return RedirectResponse(url="/api/v1/linkedin/auth_alt")
            
        if error == "openid_insufficient_scope_error":
            logger.error("OpenID scope error. Trying non-OpenID standard LinkedIn scopes...")
            return RedirectResponse(url="/api/v1/linkedin/auth_alt")
            
        if error == "invalid_request" and "scope" in str(error_description).lower():
            logger.error("Scope parameter issue. Trying minimal scope approach...")
            return RedirectResponse(url="/api/v1/linkedin/auth_minimal")

        # For any other errors, show a clear error page with troubleshooting steps
        import urllib.parse
        encoded_error = urllib.parse.quote(f"{error} - {error_description}")
        return RedirectResponse(
            url=f"http://localhost:5173/sheetgpt/settings?linkedin=oauth_error&error={error}&details={encoded_error}"
        )
    
    # Check if we have the code
    if not code:
        logger.error("Missing authorization code in callback")
        return RedirectResponse(url="http://localhost:5173/sheetgpt/settings?linkedin=missing_code")
    
    if not state:
        logger.error("Missing state parameter in callback")
        return RedirectResponse(url="http://localhost:5173/sheetgpt/settings?linkedin=missing_state")
    
    # CRITICAL: In Docker environments, sessions might not persist properly between requests
    # So we'll implement a more flexible state validation approach
    stored_state = request.session.get("linkedin_oauth_state")
    logger.info(f"Stored state from session: {stored_state}, Received state: {state}")
    
    # For development/Docker environments, we'll skip strict state validation if requested
    # In production, this should be removed for security
    SKIP_STATE_VALIDATION = True  # DEVELOPMENT ONLY - set to False in production
    
    if SKIP_STATE_VALIDATION:
        logger.warning("⚠️ SECURITY WARNING: Skipping state validation for development purposes")
        # We'll set the state in the session for consistency in logs
        request.session["linkedin_oauth_state"] = state
    elif not stored_state or stored_state != state:
        logger.error(f"State mismatch: stored={stored_state}, received={state}")
        return RedirectResponse(url="http://localhost:5173/sheetgpt/settings?linkedin=state_error&session_issue=true")
    
    # Clear state from session
    request.session.pop("linkedin_oauth_state", None)
    
    try:
        # IMPROVED USER IDENTIFICATION PROCESS
        logger.info("Starting improved user identification process")
        auth_header = request.headers.get("Authorization")
        user_id = None
        
        # Check state parameter for encoded user ID (fallback mechanism)
        if state:
            try:
                # Try to extract user ID from state parameter if it was encoded there
                from ...utils.security import extract_user_id_from_state
                state_user_id = extract_user_id_from_state(state)
                if state_user_id:
                    logger.info(f"SUCCESS: Extracted user ID from state parameter: {state_user_id}")
                    user_id = state_user_id
            except Exception as state_error:
                logger.error(f"Error extracting user ID from state: {str(state_error)}")
                
        # If no user ID from state, try other methods
        if not user_id:
            # Try from authorization header if available
            if auth_header and auth_header.startswith("Bearer "):
                try:
                    token = auth_header.split(" ")[1]
                    from jose import jwt
                    from src.core.config import settings
                    
                    # Log detailed token information for debugging
                    logger.info(f"Auth header found, token length: {len(token)}")
                    
                    # Try to decode the token
                    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                    token_user_id = payload.get("sub")
                    
                    if token_user_id:
                        logger.info(f"SUCCESS: Valid user ID from token: {token_user_id}")
                        # Override user_id if token is valid
                        user_id = token_user_id
                    else:
                        logger.warning("Token decoded but no 'sub' field found")
                except Exception as token_error:
                    logger.error(f"Token decoding error: {str(token_error)}")
            else:
                logger.info("No valid Authorization header found")
            
            # Check session
            session_user_id = request.session.get("user_id")
            if session_user_id:
                logger.info(f"Found user_id in session: {session_user_id}")
                # Use session user ID if we don't have one yet
                if not user_id:
                    user_id = session_user_id
                    logger.info(f"SUCCESS: Using user ID from session: {user_id}")
                elif user_id != session_user_id:
                    logger.warning(f"User ID mismatch: current={user_id}, session={session_user_id}")
            else:
                logger.info("No user_id found in session")
        
        # If still no user ID, try to get from DB as last resort
        if not user_id:
            try:
                from src.models.models import User
                
                # Log database info for debugging
                all_users_result = await db.execute(select(User))
                all_users = all_users_result.scalars().all()

                logger.info(f"Found {len(all_users)} users in database")
                
                if all_users:
                    for user in all_users:
                        logger.info(f"User in DB: {user.id} | {user.email}")
                
                # Get first active user as fallback - only use in development
                first_user_result = await db.execute(select(User).limit(1))
                first_user = first_user_result.scalars().first()
                if first_user:
                    user_id = str(first_user.id)
                    logger.info(f"SUCCESS: Using first user from database as last resort: {user_id} | {first_user.email}")
                else:
                    logger.error("CRITICAL: No users found in database")
                    return RedirectResponse(url="http://localhost:5173/sheetgpt/settings?linkedin=no_users_in_database")
            except Exception as db_error:
                # Log the database error but continue
                logger.error(f"Database error during user lookup: {str(db_error)}")
            
        # Final verification
        if not user_id:
            logger.error("CRITICAL: No valid user ID found through any method")
            return RedirectResponse(url="http://localhost:5173/sheetgpt/settings?linkedin=auth_required")
        
        logger.info(f"Using user ID: {user_id}")
        
        # Initialize LinkedIn client
        client = LinkedInClient()
        
        # Get hostname from request or default to localhost
        host = request.headers.get("host", "localhost:8000")
        # Use https for production, http for local development
        scheme = "https" if "localhost" not in host and "127.0.0.1" not in host else "http"
        
        # Construct full callback URL with host information from the request
        redirect_uri = f"{scheme}://{host}/api/v1/linkedin/callback"
        logger.info(f"Full callback redirect URI: {redirect_uri}")
        
        # Exchange authorization code for tokens
        token_data = await client.exchange_code_for_token(
            code=code,
            redirect_uri=redirect_uri
        )
        
        # Get profile info from OAuth token exchange
        profile_info = {}
        linkedin_id = None
        try:
            # Get token data and create a client
            if 'access_token' in token_data:
                # Create a client with the new access token
                client_with_token = LinkedInClient(token_data['access_token'])
                
                # Try to get profile data with robust error handling
                try:
                    async with client_with_token as session:
                        logger.info("Attempting to retrieve LinkedIn profile with OpenID token")
                        profile = await session.get_profile()
                        logger.info(f"Retrieved LinkedIn profile: {profile}")
                        
                        # Extract the ID based on the profile format
                        # OpenID profile format has 'sub', LinkedIn API has 'id'
                        if profile:
                            profile_info = profile
                            if 'sub' in profile:
                                # OpenID Connect format
                                linkedin_id = profile['sub']
                                logger.info(f"Retrieved LinkedIn ID (OpenID format): {linkedin_id}")
                            elif 'id' in profile:
                                # Standard LinkedIn API format
                                linkedin_id = profile['id']
                                logger.info(f"Retrieved LinkedIn ID (API format): {linkedin_id}")
                            else:
                                # Unknown format, log all keys
                                logger.warning(f"Unknown profile format. Available keys: {list(profile.keys())}")
                except Exception as profile_error:
                    logger.error(f"Error retrieving profile after token exchange: {str(profile_error)}")
        except Exception as token_usage_error:
            logger.error(f"Error using new access token: {str(token_usage_error)}")
        
        # Fallback: generate a unique ID if we couldn't get one from LinkedIn
        if not linkedin_id:
            linkedin_id = f"user_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            logger.info(f"Using generated LinkedIn ID fallback: {linkedin_id} - no profile access")
        
        # Calculate token expiration
        expires_at = datetime.now() + timedelta(seconds=token_data["expires_in"])
        
        # Save LinkedIn account
        from sqlalchemy import insert
        from ...models.linkedin import LinkedInAccount
        from ...utils.security import encrypt_token
        
        # Generate encrypted tokens
        encrypted_access_token = encrypt_token(token_data["access_token"])
        encrypted_refresh_token = None
        if "refresh_token" in token_data and token_data["refresh_token"]:
            encrypted_refresh_token = encrypt_token(token_data["refresh_token"])
            
        # Check if account already exists using SQLAlchemy text object
        from sqlalchemy import text
        existing_query = await db.execute(
            text(f"SELECT id FROM linkedin_accounts WHERE user_id = '{user_id}'")
        )
        existing_result = existing_query.first()
        
        if existing_result:
            # Update existing account
            account_id = existing_result[0]
            await db.execute(
                text(f"UPDATE linkedin_accounts SET linkedin_id = '{linkedin_id}', access_token = '{encrypted_access_token}', "
                f"refresh_token = '{encrypted_refresh_token or ''}', expires_at = '{expires_at.isoformat()}', "
                f"updated_at = '{datetime.now().isoformat()}' WHERE id = {account_id}")
            )
            await db.commit()
            logger.info(f"Updated existing LinkedIn account: {account_id}")
            
            account = type('AccountObject', (), {'id': account_id})
        else:
            # Create new account using raw SQL to avoid any ORM-related issues
            new_account_query = await db.execute(
                text(f"INSERT INTO linkedin_accounts (user_id, linkedin_id, access_token, refresh_token, expires_at, created_at, updated_at) "
                f"VALUES ('{user_id}', '{linkedin_id}', '{encrypted_access_token}', '{encrypted_refresh_token or ''}', "
                f"'{expires_at.isoformat()}', '{datetime.now().isoformat()}', '{datetime.now().isoformat()}') RETURNING id")
            )
            new_account_id = new_account_query.scalar()
            await db.commit()
            logger.info(f"Created new LinkedIn account: {new_account_id}")
            
            account_id = new_account_id

        logger.info(f"Created/updated LinkedIn account: {account_id}")
        
        # Add background task to process connections
        if background_tasks and account_id is not None:
            background_tasks.add_task(
                process_linkedin_connections,
                account_id,
                db
            )
            logger.info("Added background task to process connections")
        
        # Redirect to frontend settings page on port 5173
        return RedirectResponse(url="http://localhost:5173/sheetgpt/settings?linkedin=connected")
    except Exception as e:
        logger.error(f"LinkedIn callback error: {str(e)}")
        # Redirect to frontend settings page with error
        return RedirectResponse(url=f"http://localhost:5173/sheetgpt/settings?linkedin=error&message={str(e)}")


@router.get("/status", response_model=LinkedInStatusResponse)
async def get_linkedin_status(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user_id: Optional[UUID] = None
):
    """
    Get LinkedIn connection status for the current user.
    Handle authentication errors gracefully by returning not-connected state.
    """
    # DEBUGGING MODE - Set to true for more comprehensive output
    DEBUG_MODE = True
    
    try:
        if DEBUG_MODE:
            logger.info("==== LinkedIn Status Debug Information ====")
            logger.info(f"Request headers: {dict(request.headers)}")
            logger.info(f"Request session: {dict(request.session)}")
            logger.info(f"Initial current_user_id: {current_user_id}")
            
        # First check if user_id is already in session (most reliable)
        session_user_id = request.session.get("user_id")
        if session_user_id and not current_user_id:
            try:
                current_user_id = UUID(session_user_id)
                logger.info(f"Using user_id from session: {current_user_id}")
            except ValueError:
                logger.warning(f"Invalid user_id in session: {session_user_id}")

        # If no user_id in session, try other methods
        if current_user_id is None:
            # Try to get from Bearer token in header
            auth_header = request.headers.get("Authorization")
            if DEBUG_MODE:
                logger.info(f"Authorization header: {auth_header}")
                
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                if DEBUG_MODE:
                    logger.info(f"Found token in Authorization header (length): {len(token)}")
                    
                try:
                    from jose import jwt
                    from src.core.config import settings
                    
                    # Print detailed debug info
                    logger.info(f"SECRET_KEY length: {len(settings.SECRET_KEY)}")
                    logger.info(f"Token first 100 chars: {token[:100]}...")
                    logger.info(f"Raw token: {token}")
                    
                    try:
                        # Print token parts to debug
                        parts = token.split('.')
                        logger.info(f"Token has {len(parts)} parts")
                        if len(parts) == 3:
                            import base64
                            import json
                            
                            # Decode header
                            header_json = base64.b64decode(parts[0] + '=' * (-len(parts[0]) % 4)).decode('utf-8')
                            header = json.loads(header_json)
                            logger.info(f"Token header: {header}")
                            
                            # Decode payload
                            payload_json = base64.b64decode(parts[1] + '=' * (-len(parts[1]) % 4)).decode('utf-8')
                            decoded_payload = json.loads(payload_json)
                            logger.info(f"Token payload: {decoded_payload}")
                    except Exception as decode_error:
                        logger.error(f"Error decoding token parts: {str(decode_error)}")
                    
                    payload = jwt.decode(
                        token,
                        settings.SECRET_KEY,
                        algorithms=["HS256"]
                    )
                    if DEBUG_MODE:
                        logger.info(f"JWT payload: {payload}")
                        
                    user_id = payload.get("sub")
                    if user_id:
                        current_user_id = UUID(user_id)
                        # Store in session for future use
                        request.session["user_id"] = str(current_user_id)
                        logger.info(f"Stored user_id in session from auth header: {current_user_id}")
                except Exception as e:
                    logger.warning(f"Error decoding token: {str(e)}")
                    if DEBUG_MODE:
                        import traceback
                        logger.warning(f"Token decode traceback: {traceback.format_exc()}")
            
            # If still no user ID, try query parameter
            if current_user_id is None:
                access_token = request.query_params.get("access_token")
                if access_token:
                    if DEBUG_MODE:
                        logger.info(f"Found token in query parameter")
                    try:
                        from jose import jwt
                        from src.core.config import settings
                        payload = jwt.decode(
                            access_token,
                            settings.SECRET_KEY,
                            algorithms=["HS256"]
                        )
                        user_id = payload.get("sub")
                        if user_id:
                            current_user_id = UUID(user_id)
                            # Store in session for future use
                            request.session["user_id"] = str(current_user_id)
                            logger.info(f"Stored user_id in session from query param: {current_user_id}")
                    except Exception as e:
                        logger.warning(f"Error decoding access_token param: {str(e)}")
        
        # DIRECT DB CHECK (for debugging)
        if DEBUG_MODE and current_user_id is None:
            # Create a direct database connection to check the LinkedIn account directly
            from sqlalchemy import create_engine, text
            from sqlalchemy.orm import sessionmaker
            from src.utils.database import SQLALCHEMY_DATABASE_URL
            
            logger.info("DEBUG MODE: Using direct database connection to check LinkedIn accounts")
            engine = create_engine(SQLALCHEMY_DATABASE_URL)
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            direct_db = SessionLocal()
            
            try:
                # Get LinkedIn accounts
                accounts = direct_db.execute(text("SELECT * FROM linkedin_accounts LIMIT 5")).fetchall()
                logger.info(f"Found {len(accounts)} LinkedIn accounts in database:")
                
                for account in accounts:
                    account_id, user_id, linkedin_id = account[0], account[1], account[2]
                    logger.info(f"LinkedIn Account ID: {account_id} | User ID: {user_id} | LinkedIn ID: {linkedin_id}")
                    
                    # For testing, use the first account's user_id
                    if current_user_id is None:
                        current_user_id = user_id
                        logger.info(f"DEBUG MODE: Using first LinkedIn account's user ID: {current_user_id}")
                
            finally:
                direct_db.close()
                
        # If we still don't have a user ID, return not connected
        if current_user_id is None:
            logger.info("No valid user ID found, returning not connected LinkedIn status")
            return LinkedInStatusResponse(is_connected=False)
        
        logger.info(f"Using user ID for LinkedIn status check: {current_user_id}")
        
        # Use raw SQL to get LinkedIn account to avoid async issues
        from sqlalchemy import text
        account_query = await db.execute(
            text(f"SELECT * FROM linkedin_accounts WHERE user_id = '{current_user_id}'")
        )
        account_row = account_query.fetchone()
        
        if not account_row:
            logger.info(f"No LinkedIn account found for user {current_user_id}")
            return LinkedInStatusResponse(is_connected=False)
        
        if DEBUG_MODE:
            logger.info(f"Found LinkedIn account in database: {account_row}")
            
        # Get connection count - use async version
        connection_service = ConnectionService(db)
        connection_count = await connection_service.get_user_connections_count(current_user_id)
        
        # Get profile info
        profile_name = f"LinkedIn User {account_row[2]}"  # Default name using LinkedIn ID
        last_synced = account_row[6]
        
        # Try to get more detailed profile info
        try:
            # Create a simple account object from the row
            from ...models.linkedin import LinkedInAccount
            linkedin_service = LinkedInService(db)
            
            # Create a simple account object that matches what the get_client_for_user expects
            class SimpleAccount:
                def __init__(self, row):
                    self.id = row[0]
                    self.user_id = row[1]
                    self.linkedin_id = row[2]
                    self.access_token = row[3]
                    self.refresh_token = row[4]
                    self.expires_at = row[5]
                    self.last_synced = row[6]
                    self.created_at = row[7]
                    self.updated_at = row[8]
            
            account = SimpleAccount(account_row)
            
            # Use existing account data to create client
            from ...utils.security import decrypt_token
            decrypted_token = decrypt_token(account.access_token)
            
            client = LinkedInClient(decrypted_token)
            async with client as session:
                profile = await session.get_profile()
                
                if DEBUG_MODE:
                    logger.info(f"LinkedIn profile data: {profile}")
                
                # Extract profile name from different possible formats
                if "name" in profile:
                    # OpenID format
                    profile_name = profile.get("name", "LinkedIn User")
                elif "firstName" in profile and isinstance(profile["firstName"], dict):
                    # LinkedIn API v2 format with localized fields
                    first_name = profile.get("firstName", {}).get("localized", {}).get("en_US", "")
                    last_name = profile.get("lastName", {}).get("localized", {}).get("en_US", "")
                    profile_name = f"{first_name} {last_name}".strip()
                elif "localizedFirstName" in profile and "localizedLastName" in profile:
                    # Simplified LinkedIn API format
                    first_name = profile.get("localizedFirstName", "")
                    last_name = profile.get("localizedLastName", "")
                    profile_name = f"{first_name} {last_name}".strip()
                
                if not profile_name:
                    profile_name = f"LinkedIn User {account.linkedin_id}"
                    
        except Exception as e:
            logger.error(f"Error retrieving LinkedIn profile: {str(e)}")
            if DEBUG_MODE:
                import traceback
                logger.error(f"Profile retrieval traceback: {traceback.format_exc()}")
        
        # Return connected status with account details
        return LinkedInStatusResponse(
            is_connected=True,
            profile_name=profile_name,
            connection_count=connection_count,
            last_synced=last_synced
        )
    except Exception as e:
        # Catch any other exceptions and return not connected
        logger.error(f"Error in LinkedIn status endpoint: {str(e)}")
        if DEBUG_MODE:
            import traceback
            logger.error(f"Status endpoint traceback: {traceback.format_exc()}")
        return LinkedInStatusResponse(is_connected=False)


@router.delete("/disconnect")
async def disconnect_linkedin(
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Disconnect LinkedIn account for the current user.
    """
    # Delete LinkedIn account and all related data
    linkedin_service = LinkedInService(db)
    result = linkedin_service.delete_linkedin_account(str(current_user_id))
    
    if not result:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail="LinkedIn account not found"
        )
        
    return {"status": "success", "message": "LinkedIn account disconnected"}


@router.post("/sync")
async def sync_linkedin_connections(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user_id: Optional[UUID] = None
):
    """
    Manually trigger sync of LinkedIn connections.
    """
    # Get user ID using similar approach as status endpoint
    # First check if user_id is already in session (most reliable)
    session_user_id = request.session.get("user_id")
    if session_user_id and not current_user_id:
        try:
            current_user_id = UUID(session_user_id)
            logger.info(f"Using user_id from session: {current_user_id}")
        except ValueError:
            logger.warning(f"Invalid user_id in session: {session_user_id}")

    # If no user_id in session, try from Bearer token in header
    if current_user_id is None:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                from jose import jwt
                from src.core.config import settings
                payload = jwt.decode(
                    token,
                    settings.SECRET_KEY,
                    algorithms=["HS256"]
                )
                user_id = payload.get("sub")
                if user_id:
                    current_user_id = UUID(user_id)
                    # Store in session for future use
                    request.session["user_id"] = str(current_user_id)
                    logger.info(f"Stored user_id in session from auth header: {current_user_id}")
            except Exception as e:
                logger.warning(f"Error decoding token: {str(e)}")
    
    # If we still don't have a user ID, return 401
    if current_user_id is None:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Get LinkedIn account using raw SQL to be async-compatible
    from sqlalchemy import text
    account_query = await db.execute(
        text(f"SELECT * FROM linkedin_accounts WHERE user_id = '{current_user_id}'")
    )
    account_row = account_query.fetchone()
    
    if not account_row:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail="LinkedIn account not found"
        )
    
    # Get account ID from the row    
    account_id = account_row[0]
    
    # Add background task to process connections
    background_tasks.add_task(
        process_linkedin_connections,
        account_id,
        db
    )
    
    return {"status": "success", "message": "Connection sync started"}


@router.post("/sync-direct")
async def sync_linkedin_direct(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Directly process LinkedIn connections without background tasks.
    This is for debugging purposes.
    """
    # Choose the first LinkedIn account for testing
    from sqlalchemy import text
    account_query = await db.execute(
        text("SELECT * FROM linkedin_accounts LIMIT 1")
    )
    account_row = account_query.fetchone()
    
    if not account_row:
        return {"status": "error", "message": "No LinkedIn accounts found"}
    
    # Get account info
    account_id = account_row[0]
    user_id = account_row[1]
    linkedin_id = account_row[2]
    
    logger.info(f"Processing LinkedIn connections for account {account_id}, user {user_id}")
    
    try:
        # Create a simple account object for compatibility with existing code
        class SimpleAccount:
            def __init__(self, row):
                self.id = row[0]
                self.user_id = row[1] 
                self.linkedin_id = row[2]
                self.access_token = row[3]
                self.refresh_token = row[4]
                self.expires_at = row[5]
                self.last_synced = row[6]
        
        account = SimpleAccount(account_row)
        
        # Get LinkedIn client manually
        from ...utils.security import decrypt_token
        from ...services.linkedin.linkedin_service import LinkedInClient
        
        try:
            # Decrypt the access token
            decrypted_token = decrypt_token(account.access_token)
            
            # Create a client and get profile and connections
            client = LinkedInClient(decrypted_token)
            async with client as session:
                # Get profile
                profile = await session.get_profile()
                logger.info(f"Retrieved LinkedIn profile: {profile}")
                
                # Get connections (mock data will be provided)
                connections = await session.get_connections()
                logger.info(f"Retrieved {len(connections.get('elements', []))} LinkedIn connections")
                
                # Save connections to database
                connection_service = ConnectionService(db)
                saved_count = await connection_service.save_connections(
                    user_id=account.user_id,
                    connections=connections.get('elements', []),
                    connection_degree=1
                )
                logger.info(f"Saved {saved_count} LinkedIn connections to database")
                
                # Match connections to brands
                stats = await connection_service.match_connections_to_brands(account.user_id)
                logger.info(f"Connection matching stats: {stats}")
                
                # Update last synced timestamp
                now = datetime.now().isoformat()
                await db.execute(
                    text(f"UPDATE linkedin_accounts SET last_synced = '{now}' WHERE id = {account.id}")
                )
                await db.commit()
                
                return {
                    "status": "success",
                    "profile": profile,
                    "connections_count": len(connections.get('elements', [])),
                    "saved_count": saved_count,
                    "matching_stats": stats
                }
                
        except Exception as e:
            logger.error(f"Error processing connections: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {"status": "error", "message": f"Error processing connections: {str(e)}"}
            
    except Exception as e:
        logger.error(f"Error in direct sync: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {"status": "error", "message": str(e)}


@router.get("/connections/brands", response_model=List[BrandConnectionResponse])
async def get_brand_connections(
    request: Request,
    min_connections: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user_id: Optional[UUID] = None
):
    """
    Get all brands with LinkedIn connections for the current user.
    
    Args:
        min_connections: Minimum total connections to include (default: 0)
    """
    # Get user ID using similar approach as status endpoint
    # First check if user_id is already in session (most reliable)
    session_user_id = request.session.get("user_id")
    if session_user_id and not current_user_id:
        try:
            current_user_id = UUID(session_user_id)
            logger.info(f"Using user_id from session: {current_user_id}")
        except ValueError:
            logger.warning(f"Invalid user_id in session: {session_user_id}")

    # If no user_id in session, try from Bearer token in header
    if current_user_id is None:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                from jose import jwt
                from src.core.config import settings
                payload = jwt.decode(
                    token,
                    settings.SECRET_KEY,
                    algorithms=["HS256"]
                )
                user_id = payload.get("sub")
                if user_id:
                    current_user_id = UUID(user_id)
                    # Store in session for future use
                    request.session["user_id"] = str(current_user_id)
                    logger.info(f"Stored user_id in session from auth header: {current_user_id}")
            except Exception as e:
                logger.warning(f"Error decoding token: {str(e)}")
    
    # If still no user ID, try using debug approach
    if current_user_id is None:
        # For debugging, get the first LinkedIn account from the database
        from sqlalchemy import create_engine, text
        from sqlalchemy.orm import sessionmaker
        from src.utils.database import SQLALCHEMY_DATABASE_URL
        
        logger.info("DEBUG: Trying to find a user ID from LinkedIn accounts")
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        direct_db = SessionLocal()
        
        try:
            accounts = direct_db.execute(text("SELECT * FROM linkedin_accounts LIMIT 1")).fetchall()
            if accounts:
                current_user_id = accounts[0][1]  # User ID is the second column
                logger.info(f"DEBUG: Using user ID from first LinkedIn account: {current_user_id}")
        finally:
            direct_db.close()
    
    # If we still don't have a user ID, return 401
    if current_user_id is None:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
        
    # Check if user has LinkedIn account using raw SQL
    from sqlalchemy import text
    account_query = await db.execute(
        text(f"SELECT * FROM linkedin_accounts WHERE user_id = '{current_user_id}'")
    )
    account = account_query.fetchone()
    
    if not account:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail="LinkedIn account not connected"
        )
        
    # Get brand connections
    connection_service = ConnectionService(db)
    brand_connections = await connection_service.get_brand_connections(
        current_user_id,
        min_connections=min_connections
    )
    
    return brand_connections


@router.get("/connections/brands/{brand_id}", response_model=BrandConnectionResponse)
async def get_brand_connection(
    brand_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user_id: Optional[UUID] = None
):
    """
    Get LinkedIn connections for a specific brand.
    
    Args:
        brand_id: The UUID of the brand
    """
    # Get user ID using similar approach as status endpoint
    # First check if user_id is already in session (most reliable)
    session_user_id = request.session.get("user_id")
    if session_user_id and not current_user_id:
        try:
            current_user_id = UUID(session_user_id)
            logger.info(f"Using user_id from session: {current_user_id}")
        except ValueError:
            logger.warning(f"Invalid user_id in session: {session_user_id}")

    # If no user_id in session, try from Bearer token in header
    if current_user_id is None:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                from jose import jwt
                from src.core.config import settings
                payload = jwt.decode(
                    token,
                    settings.SECRET_KEY,
                    algorithms=["HS256"]
                )
                user_id = payload.get("sub")
                if user_id:
                    current_user_id = UUID(user_id)
                    # Store in session for future use
                    request.session["user_id"] = str(current_user_id)
                    logger.info(f"Stored user_id in session from auth header: {current_user_id}")
            except Exception as e:
                logger.warning(f"Error decoding token: {str(e)}")
    
    # If still no user ID, try using debug approach
    if current_user_id is None:
        # For debugging, get the first LinkedIn account from the database
        from sqlalchemy import create_engine, text
        from sqlalchemy.orm import sessionmaker
        from src.utils.database import SQLALCHEMY_DATABASE_URL
        
        logger.info("DEBUG: Trying to find a user ID from LinkedIn accounts")
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        direct_db = SessionLocal()
        
        try:
            accounts = direct_db.execute(text("SELECT * FROM linkedin_accounts LIMIT 1")).fetchall()
            if accounts:
                current_user_id = accounts[0][1]  # User ID is the second column
                logger.info(f"DEBUG: Using user ID from first LinkedIn account: {current_user_id}")
        finally:
            direct_db.close()
    
    # If we still don't have a user ID, return 401
    if current_user_id is None:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
        
    # Check if user has LinkedIn account using raw SQL
    from sqlalchemy import text
    account_query = await db.execute(
        text(f"SELECT * FROM linkedin_accounts WHERE user_id = '{current_user_id}'")
    )
    account = account_query.fetchone()
    
    if not account:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail="LinkedIn account not connected"
        )
        
    # Get brand connection
    connection_service = ConnectionService(db)
    brand_connection = await connection_service.get_brand_connection(
        current_user_id,
        brand_id
    )
    
    if not brand_connection:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail="Brand connection not found"
        )
        
    return brand_connection