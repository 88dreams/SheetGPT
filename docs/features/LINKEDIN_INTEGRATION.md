# LinkedIn Integration Technical Specification

> **IMPLEMENTATION STATUS**: Core functionality complete! Integration available through CSV import functionality. Users can import LinkedIn connections from exported CSV files and visualize relationships with brands in the database.

## Overview

This document outlines the technical specifications for integrating LinkedIn connectivity data with the SheetGPT platform. The integration allows users to import their LinkedIn connections via CSV export and visualize their professional network's relationships with brands/companies in the SheetGPT database.

### Recent Updates (April 2025)

- ✅ Completed database models and migrations for Contact and ContactBrandAssociation
- ✅ Created CSV import functionality with flexible column mapping
- ✅ Implemented entity matching algorithm with fuzzy name matching
- ✅ Built contact management UI components for viewing and editing contacts
- ✅ Added API endpoints for contact data and CSV import
- ✅ Created ContactsList and ContactDetail components
- ✅ Implemented automatic brand association with confidence scoring
- ✅ Added filtering and search capabilities for contacts
- ✅ Integrated contact management into the main application

## Table of Contents

1. [Goals and Requirements](#goals-and-requirements)
2. [Architecture](#architecture)
3. [Data Model](#data-model)
4. [API Integration](#api-integration)
5. [Authentication Flow](#authentication-flow)
6. [User Interface](#user-interface)
7. [Data Processing](#data-processing)
8. [Privacy and Security](#privacy-and-security)
9. [Testing Strategy](#testing-strategy)
10. [Implementation Phases](#implementation-phases)
11. [Limitations and Risks](#limitations-and-risks)

## Goals and Requirements

### Primary Goals

- Allow users to connect their LinkedIn accounts to SheetGPT
- Identify which brands in SheetGPT have connections to the user's network
- Visualize 1st and 2nd-degree connections to brands
- Enhance the SheetGPT platform with network intelligence

### Requirements

#### Functional Requirements

- **Authentication**: Users must be able to authorize SheetGPT to access their LinkedIn data
- **Connection Analysis**: System must identify and match companies from LinkedIn with brands in SheetGPT
- **Visualization**: UI must display connection information in brand listings and details
- **Filtering**: Users must be able to filter brands by connection status
- **Privacy Controls**: Users must be able to disconnect their LinkedIn account and remove connection data

#### Non-Functional Requirements

- **Performance**: Connection data processing must not significantly impact platform performance
- **Security**: LinkedIn tokens and connection data must be securely stored
- **Scalability**: System must handle multiple users with large professional networks
- **Reliability**: Connection status must remain accurate even with LinkedIn API limitations

## Architecture

### System Components

```text
┌───────────────────┐     ┌────────────────────┐     ┌────────────────┐
│                   │     │                    │     │                │
│  SheetGPT         │     │  LinkedIn          │     │  LinkedIn      │
│  Frontend         │◄────┤  Integration       │◄────┤  API           │
│  (React)          │     │  Service           │     │                │
│                   │     │                    │     │                │
└───────────────────┘     └────────────────────┘     └────────────────┘
         ▲                          ▲
         │                          │
         │                          │
         ▼                          ▼
┌───────────────────┐     ┌────────────────────┐
│                   │     │                    │
│  Brand            │◄────┤  Connection        │
│  Service          │     │  Repository        │
│                   │     │                    │
└───────────────────┘     └────────────────────┘
         ▲                          ▲
         │                          │
         │                          │
         ▼                          ▼
┌───────────────────┐     ┌────────────────────┐
│                   │     │                    │
│  Database         │     │  Entity            │
│  (PostgreSQL)     │     │  Matching Engine   │
│                   │     │                    │
└───────────────────┘     └────────────────────┘
```

### Component Descriptions

1. **LinkedIn Integration Service**:
   - Handles OAuth flow with LinkedIn
   - Manages token refresh and validation
   - Provides API for fetching and processing connection data

2. **Connection Repository**:
   - Stores and manages LinkedIn connection data
   - Implements caching for API rate limit compliance
   - Provides data access layer for connection information

3. **Entity Matching Engine**:
   - Matches LinkedIn company data with SheetGPT brands
   - Implements fuzzy matching algorithms for company names
   - Provides confidence scores for matches

4. **Brand Service**:
   - Enhanced to include connection data
   - Provides filtered views based on connection status
   - Aggregates connection metrics for brands

## Data Model

### New Database Tables

#### `linkedin_accounts`

```sql
CREATE TABLE linkedin_accounts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    linkedin_id VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);
```

#### `linkedin_connections`

```sql
CREATE TABLE linkedin_connections (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    linkedin_profile_id VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    position VARCHAR(255),
    connection_degree SMALLINT NOT NULL, -- 1 for 1st degree, 2 for 2nd degree
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, linkedin_profile_id)
);
```

#### `brand_connections`

```sql
CREATE TABLE brand_connections (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    first_degree_count INTEGER NOT NULL DEFAULT 0,
    second_degree_count INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, brand_id)
);
```

### Pydantic Models

#### LinkedInAccount

```python
class LinkedInAccount(BaseModel):
    id: int
    user_id: UUID
    linkedin_id: str
    access_token: str
    refresh_token: Optional[str]
    expires_at: datetime
    created_at: datetime
    updated_at: datetime

class LinkedInAccountCreate(BaseModel):
    user_id: UUID
    linkedin_id: str
    access_token: str
    refresh_token: Optional[str]
    expires_at: datetime
```

#### LinkedInConnection

```python
class LinkedInConnection(BaseModel):
    id: int
    user_id: UUID
    linkedin_profile_id: str
    full_name: str
    company_name: Optional[str]
    position: Optional[str]
    connection_degree: int
    created_at: datetime
    updated_at: datetime

class LinkedInConnectionCreate(BaseModel):
    user_id: UUID
    linkedin_profile_id: str
    full_name: str
    company_name: Optional[str] = None
    position: Optional[str] = None
    connection_degree: int
```

#### BrandConnection

```python
class BrandConnection(BaseModel):
    id: int
    user_id: UUID
    brand_id: UUID
    first_degree_count: int
    second_degree_count: int
    last_updated: datetime

class BrandConnectionCreate(BaseModel):
    user_id: UUID
    brand_id: UUID
    first_degree_count: int = 0
    second_degree_count: int = 0
```

## API Integration

### LinkedIn API Endpoints to Use

| Endpoint | Purpose | Data Retrieved |
|----------|---------|----------------|
| GET /v2/me | Retrieve basic profile information | ID, name, headline |
| GET /v2/emailAddress | Retrieve user's email address | Email address |
| GET /v2/connections | Retrieve 1st-degree connections | Connection profiles with current positions |
| GET /v2/companies/{id} | Retrieve company details | Company name, industry, size |

### Rate Limiting Considerations

- LinkedIn API has strict rate limits (typically 100 calls per day per user)
- Implement caching mechanisms to reduce API calls
- Schedule background refreshes during off-peak hours
- Implement exponential backoff for rate limit errors

### LinkedIn API Client

```python
from linkedin import Client as LinkedInClient
from .models import LinkedInAccount, LinkedInConnection

class SheetGPTLinkedInClient:
    def __init__(self, linkedin_account: LinkedInAccount):
        self.account = linkedin_account
        self._client = LinkedInClient(
            access_token=linkedin_account.access_token
        )
        
    async def get_profile(self):
        """Retrieve the user's basic profile information"""
        profile = await self._client.get('/v2/me')
        return profile
        
    async def get_connections(self):
        """Retrieve the user's 1st-degree connections"""
        connections = []
        start = 0
        count = 50
        has_more = True
        
        while has_more:
            response = await self._client.get(
                '/v2/connections',
                params={'start': start, 'count': count}
            )
            connections.extend(response.get('elements', []))
            
            # Check if there are more connections to fetch
            total = response.get('paging', {}).get('total', 0)
            start += count
            has_more = start < total
            
        return connections
        
    async def refresh_token_if_needed(self):
        """Check if token needs refresh and refresh if necessary"""
        if self._is_token_expired():
            await self._refresh_token()
            
    def _is_token_expired(self):
        """Check if the access token is expired or about to expire"""
        # Add a buffer of 5 minutes to ensure we refresh before expiration
        buffer = timedelta(minutes=5)
        return datetime.now() + buffer >= self.account.expires_at
        
    async def _refresh_token(self):
        """Refresh the access token using the refresh token"""
        if not self.account.refresh_token:
            raise ValueError("No refresh token available")
            
        # Implement token refresh logic
        # ...
```

## Authentication Flow

### OAuth 2.0 Integration

1. **Initiate OAuth Flow**:
   - User clicks "Connect LinkedIn" button
   - Backend generates a secure state parameter and redirects to LinkedIn login

2. **LinkedIn Authorization**:
   - User logs into LinkedIn and authorizes the app
   - LinkedIn redirects back to SheetGPT with an authorization code

3. **Token Exchange**:
   - Backend exchanges authorization code for access and refresh tokens
   - Tokens are stored securely in the database

4. **Token Management**:
   - Implement token refresh mechanism
   - Handle token revocation
   - Monitor and log authentication errors

### Implementation Code (FastAPI Routes)

```python
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from starlette.responses import RedirectResponse
from uuid import UUID

from . import schemas, crud, linkedin_client
from .dependencies import get_db, get_current_user

router = APIRouter(prefix="/api/v1/linkedin", tags=["linkedin"])

@router.get("/auth")
async def initiate_linkedin_auth(request: Request, current_user = Depends(get_current_user)):
    """Initiate LinkedIn OAuth flow"""
    # Generate a secure state parameter
    state = generate_secure_state(str(current_user.id))
    
    # Store state in session for verification
    request.session["linkedin_oauth_state"] = state
    
    # Redirect to LinkedIn authorization page
    redirect_uri = request.url_for("linkedin_callback")
    auth_url = linkedin_client.get_authorization_url(
        redirect_uri=str(redirect_uri),
        state=state,
        scope=["r_liteprofile", "r_emailaddress", "r_1st_connections_size"]
    )
    
    return RedirectResponse(auth_url)

@router.get("/callback")
async def linkedin_callback(
    request: Request,
    code: str,
    state: str,
    db: Session = Depends(get_db)
):
    """Handle LinkedIn OAuth callback"""
    # Verify state parameter to prevent CSRF
    stored_state = request.session.get("linkedin_oauth_state")
    if not stored_state or stored_state != state:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    # Clear state from session
    request.session.pop("linkedin_oauth_state", None)
    
    # Exchange authorization code for tokens
    redirect_uri = request.url_for("linkedin_callback")
    token_data = await linkedin_client.exchange_code_for_token(
        code=code,
        redirect_uri=str(redirect_uri)
    )
    
    # Get user ID from state
    user_id = extract_user_id_from_state(state)
    
    # Get LinkedIn profile ID
    client = linkedin_client.LinkedInClient(token_data["access_token"])
    profile = await client.get_profile()
    linkedin_id = profile["id"]
    
    # Save or update LinkedIn account
    linkedin_account = await crud.save_linkedin_account(
        db,
        schemas.LinkedInAccountCreate(
            user_id=user_id,
            linkedin_id=linkedin_id,
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token"),
            expires_at=datetime.now() + timedelta(seconds=token_data["expires_in"])
        )
    )
    
    # Trigger background task to fetch and process connections
    background_tasks.add_task(
        process_linkedin_connections,
        linkedin_account.id
    )
    
    # Redirect to success page
    return RedirectResponse("/settings?linkedin=connected")
```

## User Interface

### New UI Components

#### LinkedIn Connection Button

- Placed in user settings or profile area
- Shows connection status (Connected/Disconnected)
- Initiates OAuth flow when clicked

#### Connection Badge Component

- Appears on brand cards in listings
- Shows connection degree (1st/2nd) and count
- Uses different colors for different connection types

#### Connection Details Panel

- Appears in brand detail view
- Shows aggregated connection information
- Lists 1st-degree connections by name (if available)

#### Connection Filter Component

- Added to brand filters section
- Allows filtering by connection degree
- Provides sorting by connection count

### UI Mockups

1. **Brand List with Connection Badges**

```text
┌────────────────────────────────────────────────────┐
│ Brands                                     Filter ▼ │
├────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────┐   │
│ │ ESPN                                         │   │
│ │ Media, Broadcaster                           │   │
│ │                                              │   │
│ │ ┌──────────┐                                 │   │
│ │ │ 1st: 3   │ Connections at this company     │   │
│ │ │ 2nd: 12  │                                 │   │
│ │ └──────────┘                                 │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌──────────────────────────────────────────────┐   │
│ │ NBC Sports                                   │   │
│ │ Media, Broadcaster                           │   │
│ │                                              │   │
│ │ ┌──────────┐                                 │   │
│ │ │ 1st: 0   │ Connections at this company     │   │
│ │ │ 2nd: 5   │                                 │   │
│ │ └──────────┘                                 │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌──────────────────────────────────────────────┐   │
│ │ FOX Sports                                   │   │
│ │ Media, Broadcaster                           │   │
│ │                                              │   │
│ │ No LinkedIn connections                      │   │
│ │                                              │   │
│ └──────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

2.**Brand Detail with Connection Panel**

```text
┌────────────────────────────────────────────────────┐
│ ESPN                                        Edit ▼ │
├────────────────────────────────────────────────────┤
│ Details  Broadcasts  Productions  Connections      │
├────────────────────────────────────────────────────┤
│                                                    │
│ LinkedIn Connections                               │
│                                                    │
│ 1st Degree Connections (3)                         │
│ ┌─────────────────────────────────────────────┐    │
│ │ John Smith - Senior Producer                │    │
│ │ Jane Doe - VP, Content Strategy             │    │
│ │ Alex Johnson - Director, Digital Media      │    │
│ └─────────────────────────────────────────────┘    │
│                                                    │
│ 2nd Degree Connections                             │
│ ┌─────────────────────────────────────────────┐    │
│ │ 12 people in your extended network          │    │
│ │                                             │    │
│ │ Top mutual connections:                     │    │
│ │ Sarah Williams, Michael Brown, David Lee    │    │
│ └─────────────────────────────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
```

3.**Settings Page with LinkedIn Integration**

```text
┌────────────────────────────────────────────────────┐
│ User Settings                                      │
├────────────────────────────────────────────────────┤
│ Profile  Security  Integrations  Preferences       │
├────────────────────────────────────────────────────┤
│                                                    │
│ LinkedIn Integration                               │
│                                                    │
│ Status: Connected                                  │
│ Connected as: John Doe                             │
│ Last synced: Today at 2:30 PM                      │
│                                                    │
│ ┌──────────────┐     ┌──────────────────────┐      │
│ │ Disconnect   │     │ Sync Connections Now │      │
│ └──────────────┘     └──────────────────────┘      │
│                                                    │
│ Privacy Settings                                   │
│ ☑ Show my 1st-degree connections                   │
│ ☑ Show my 2nd-degree connections                   │
│ ☐ Show connection names to other users             │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Frontend Implementation

#### React Components

```typescript
// LinkedInConnectButton.tsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../utils/api';

export const LinkedInConnectButton: React.FC = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function checkLinkedInConnection() {
      try {
        const response = await api.linkedin.getStatus();
        setIsConnected(response.isConnected);
      } catch (error) {
        console.error('Error checking LinkedIn connection:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (user) {
      checkLinkedInConnection();
    }
  }, [user]);
  
  const handleConnect = () => {
    window.location.href = '/api/v1/linkedin/auth';
  };
  
  const handleDisconnect = async () => {
    try {
      await api.linkedin.disconnect();
      setIsConnected(false);
    } catch (error) {
      console.error('Error disconnecting LinkedIn account:', error);
    }
  };
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="linkedin-connect-container">
      {isConnected ? (
        <div>
          <div className="connection-status connected">
            <span className="status-icon">✓</span>
            <span>Connected to LinkedIn</span>
          </div>
          <button 
            className="disconnect-button"
            onClick={handleDisconnect}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button 
          className="connect-button linkedin"
          onClick={handleConnect}
        >
          <img src="/icons/linkedin.svg" alt="LinkedIn" />
          Connect with LinkedIn
        </button>
      )}
    </div>
  );
};
```

```typescript
// ConnectionBadge.tsx
import React from 'react';

interface ConnectionBadgeProps {
  brandId: string;
  firstDegreeCount: number;
  secondDegreeCount: number;
}

export const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({
  brandId,
  firstDegreeCount,
  secondDegreeCount
}) => {
  // Skip rendering if no connections
  if (firstDegreeCount === 0 && secondDegreeCount === 0) {
    return <div className="no-connections">No LinkedIn connections</div>;
  }
  
  return (
    <div className="connection-badge">
      <div className="connection-counts">
        <div className="first-degree">
          <span className="count">{firstDegreeCount}</span>
          <span className="label">1st</span>
        </div>
        <div className="second-degree">
          <span className="count">{secondDegreeCount}</span>
          <span className="label">2nd</span>
        </div>
      </div>
      <div className="connection-label">Connections at this company</div>
    </div>
  );
};
```

#### Integration with Existing Components

```typescript
// BrandCard.tsx (modified)
import React from 'react';
import { ConnectionBadge } from './ConnectionBadge';
import { useLinkedInConnections } from '../../hooks/useLinkedInConnections';

interface BrandCardProps {
  brand: Brand;
}

export const BrandCard: React.FC<BrandCardProps> = ({ brand }) => {
  const { getConnectionsForBrand } = useLinkedInConnections();
  const connections = getConnectionsForBrand(brand.id);
  
  return (
    <div className="brand-card">
      <h3>{brand.name}</h3>
      <p>{brand.industry}, {brand.company_type}</p>
      
      {/* LinkedIn Connection Badge */}
      <ConnectionBadge 
        brandId={brand.id}
        firstDegreeCount={connections.firstDegree}
        secondDegreeCount={connections.secondDegree}
      />
      
      {/* Other brand information */}
      {/* ... */}
    </div>
  );
};
```

## Data Processing

### Connection Matching Algorithm

The core of the integration is the algorithm that matches LinkedIn connections with SheetGPT brands:

```python
async def match_connections_to_brands(user_id: UUID, db: Session):
    """Match LinkedIn connections to brands in the database"""
    # Get all the user's LinkedIn connections
    connections = await crud.get_user_linkedin_connections(db, user_id)
    
    # Get all brands from the database
    brands = crud.get_all_brands(db)
    
    # Create a mapping of company names to brand IDs
    # This handles exact matches
    company_to_brand_map = {}
    for brand in brands:
        company_to_brand_map[brand.name.lower()] = brand.id
        
        # Add alternative names if available (e.g., from aliases table)
        aliases = crud.get_brand_aliases(db, brand.id)
        for alias in aliases:
            company_to_brand_map[alias.name.lower()] = brand.id
    
    # Initialize connection counts for each brand
    brand_connections = {brand.id: {"first": 0, "second": 0} for brand in brands}
    
    # Process each connection
    for connection in connections:
        if not connection.company_name:
            continue
            
        company_name = connection.company_name.lower()
        
        # Check for exact match
        if company_name in company_to_brand_map:
            brand_id = company_to_brand_map[company_name]
            if connection.connection_degree == 1:
                brand_connections[brand_id]["first"] += 1
            else:
                brand_connections[brand_id]["second"] += 1
            continue
        
        # If no exact match, try fuzzy matching
        potential_matches = fuzzy_match_company_name(company_name, brands)
        for brand_id, confidence in potential_matches:
            if confidence >= CONFIDENCE_THRESHOLD:
                if connection.connection_degree == 1:
                    brand_connections[brand_id]["first"] += 1
                else:
                    brand_connections[brand_id]["second"] += 1
                break
    
    # Save the results
    for brand_id, counts in brand_connections.items():
        if counts["first"] > 0 or counts["second"] > 0:
            await crud.save_brand_connection(
                db,
                schemas.BrandConnectionCreate(
                    user_id=user_id,
                    brand_id=brand_id,
                    first_degree_count=counts["first"],
                    second_degree_count=counts["second"]
                )
            )
            
def fuzzy_match_company_name(company_name: str, brands: List[Brand]) -> List[Tuple[UUID, float]]:
    """
    Use fuzzy matching to find potential brand matches for a company name
    Returns a list of (brand_id, confidence) tuples
    """
    results = []
    
    # Normalize the input company name
    normalized_name = normalize_company_name(company_name)
    
    for brand in brands:
        normalized_brand_name = normalize_company_name(brand.name)
        
        # Calculate match confidence using multiple methods
        
        # Method 1: Levenshtein distance
        lev_ratio = levenshtein_ratio(normalized_name, normalized_brand_name)
        
        # Method 2: Token set ratio (handles word order and extra words)
        token_ratio = fuzz.token_set_ratio(normalized_name, normalized_brand_name) / 100
        
        # Method 3: Partial ratio (handles cases where one is substring of other)
        partial_ratio = fuzz.partial_ratio(normalized_name, normalized_brand_name) / 100
        
        # Calculate combined confidence score
        confidence = (lev_ratio * 0.4) + (token_ratio * 0.4) + (partial_ratio * 0.2)
        
        # Add to results if confidence is above minimum threshold
        if confidence > MIN_CONFIDENCE_THRESHOLD:
            results.append((brand.id, confidence))
    
    # Sort by confidence (highest first) and return
    return sorted(results, key=lambda x: x[1], reverse=True)
    
def normalize_company_name(name: str) -> str:
    """
    Normalize company name for better matching
    - Remove common legal suffixes (Inc, LLC, Corp, etc.)
    - Remove punctuation
    - Standardize spacing
    - Convert to lowercase
    """
    name = name.lower()
    
    # Remove common legal suffixes
    suffixes = [" inc", " incorporated", " llc", " ltd", " limited", 
                " corp", " corporation", " co", " company"]
    for suffix in suffixes:
        if name.endswith(suffix):
            name = name[:-len(suffix)]
    
    # Remove punctuation and standardize spacing
    name = re.sub(r'[^\w\s]', '', name)
    name = re.sub(r'\s+', ' ', name).strip()
    
    return name
```

### Background Processing

To avoid blocking user interactions, connection processing should be done in background tasks:

```python
from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

async def process_linkedin_connections(linkedin_account_id: int):
    """Background task to fetch and process LinkedIn connections"""
    # Get database session
    db = next(get_db())
    
    try:
        # Get LinkedIn account
        account = crud.get_linkedin_account_by_id(db, linkedin_account_id)
        if not account:
            logger.error(f"LinkedIn account {linkedin_account_id} not found")
            return
        
        # Initialize LinkedIn client
        client = SheetGPTLinkedInClient(account)
        
        # Refresh token if needed
        await client.refresh_token_if_needed()
        
        # Get user's LinkedIn profile
        profile = await client.get_profile()
        
        # Get 1st-degree connections
        connections = await client.get_connections()
        
        # Save connections to database
        await save_connections(db, account.user_id, connections, connection_degree=1)
        
        # Match connections to brands
        await match_connections_to_brands(account.user_id, db)
        
        # Update last updated timestamp
        crud.update_linkedin_account_sync_time(db, account.id)
        
        logger.info(f"Successfully processed LinkedIn connections for user {account.user_id}")
    except Exception as e:
        logger.error(f"Error processing LinkedIn connections: {str(e)}")
    finally:
        db.close()
```

### Scheduled Refresh Tasks

LinkedIn data should be periodically refreshed to stay current:

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('interval', hours=24)
async def refresh_linkedin_connections():
    """Daily job to refresh LinkedIn connections"""
    # Get database session
    db = next(get_db())
    
    try:
        # Find accounts that need refreshing (last updated > 24 hours ago)
        cutoff_time = datetime.now() - timedelta(hours=24)
        accounts = crud.get_linkedin_accounts_to_refresh(db, cutoff_time)
        
        for account in accounts:
            # Add task to refresh connections for this account
            background_tasks.add_task(
                process_linkedin_connections,
                account.id
            )
            
        logger.info(f"Scheduled refresh for {len(accounts)} LinkedIn accounts")
    except Exception as e:
        logger.error(f"Error scheduling LinkedIn refreshes: {str(e)}")
    finally:
        db.close()

# Start the scheduler when the application starts
@app.on_event("startup")
async def startup_event():
    scheduler.start()
```

## Privacy and Security

### Data Protection Measures

1. **Token Security**:
   - Store access tokens encrypted at rest in the database
   - Never log or expose tokens in client-side code
   - Implement proper token refresh and revocation mechanisms

2. **User Consent**:
   - Provide clear consent screen before initiating LinkedIn OAuth
   - Allow users to revoke access at any time
   - Provide granular privacy controls for connection sharing

3. **Data Retention**:
   - Automatically delete connection data when user disconnects LinkedIn
   - Implement proper cascade delete for user account deletion
   - Provide data export functionality for user data

### Security Implementation

```python
from cryptography.fernet import Fernet
import os

# Create a key for encryption/decryption
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key())
cipher = Fernet(ENCRYPTION_KEY)

def encrypt_token(token: str) -> str:
    """Encrypt a token before storing in database"""
    return cipher.encrypt(token.encode()).decode()
    
def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a token retrieved from database"""
    return cipher.decrypt(encrypted_token.encode()).decode()

# Modified CRUD function to handle token encryption
async def save_linkedin_account(db: Session, account_data: schemas.LinkedInAccountCreate):
    # Check if account already exists
    existing = db.query(models.LinkedInAccount).filter_by(user_id=account_data.user_id).first()
    
    # Encrypt tokens before storing
    encrypted_access_token = encrypt_token(account_data.access_token)
    encrypted_refresh_token = None
    if account_data.refresh_token:
        encrypted_refresh_token = encrypt_token(account_data.refresh_token)
    
    if existing:
        # Update existing account
        existing.linkedin_id = account_data.linkedin_id
        existing.access_token = encrypted_access_token
        existing.refresh_token = encrypted_refresh_token
        existing.expires_at = account_data.expires_at
        existing.updated_at = datetime.now()
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new account
        db_account = models.LinkedInAccount(
            user_id=account_data.user_id,
            linkedin_id=account_data.linkedin_id,
            access_token=encrypted_access_token,
            refresh_token=encrypted_refresh_token,
            expires_at=account_data.expires_at
        )
        db.add(db_account)
        db.commit()
        db.refresh(db_account)
        return db_account
```

## Testing Strategy

### Unit Tests

1. **LinkedIn Client Tests**:
   - Test token refresh logic
   - Test API response parsing
   - Mock API responses for consistent testing

2. **Entity Matching Tests**:
   - Test company name normalization
   - Test fuzzy matching algorithm with various inputs
   - Benchmark matching performance

3. **Service Layer Tests**:
   - Test connection processing logic
   - Test background task execution
   - Test error handling and recovery

### Integration Tests

1. **API Endpoint Tests**:
   - Test OAuth flow with mock LinkedIn responses
   - Test connection synchronization
   - Test error handling on API failures

2. **UI Component Tests**:
   - Test proper rendering of connection badges
   - Test filtering and sorting by connections
   - Test user settings for LinkedIn integration

### End-to-End Tests

1. **Complete Flow Tests**:
   - Test entire LinkedIn connect/disconnect flow
   - Test connection data refresh
   - Test integration with brand details view

2. **Error Scenario Tests**:
   - Test handling of LinkedIn API rate limits
   - Test recovery from token expiration
   - Test user experience during API outages

## Implementation Phases

### Phase 1: Core Infrastructure (COMPLETED)

- Set up LinkedIn Developer application and API access
- Implement OAuth flow and token management
- Create database schema and models
- Implement basic API endpoints

#### Setup Instructions

We've created a setup script to simplify the configuration process. Run:

```bash
./setup_linkedin_integration.sh
```

This script will:

- Generate an encryption key for securely storing tokens
- Prompt you for LinkedIn Client ID and Secret
- Update your environment variables
- Apply necessary database migrations
- Ensure mock data is disabled in the frontend

### Phase 2: Data Processing (COMPLETED)

- Implement connection retrieval from LinkedIn API
- Build entity matching algorithm with fuzzy matching
- Create background processing system for connection data
- Implement connection refresh mechanism

### Phase 3: UI Integration (COMPLETED)

- Create connection badge component (LinkedInConnectionBadge)
- Implement settings page LinkedIn integration
- Add connection visualization to brand listings
- Update brand list components to show connection data

### Phase 4: Testing and Refinement (1 week)

- Conduct thorough testing of all components
- Optimize matching algorithm based on real data
- Fine-tune UI components for usability
- Implement feedback from initial user testing

### Phase 5: Launch and Monitoring (1 week)

- Deploy to production environment
- Set up monitoring for LinkedIn API usage
- Create user documentation and help guides
- Establish metrics for measuring feature adoption

## Limitations and Risks

### LinkedIn API Limitations

1. **Connection Data Access**:
   - LinkedIn API provides limited data about connections
   - No API access to 2nd-degree connections (only counts)
   - Company information may be incomplete or missing

2. **Rate Limits**:
   - Strict daily limits on API calls
   - Limited number of connection fields available
   - Potential for API changes without notice

### Technical Risks

1. **Matching Accuracy**:
   - Company name variations may lead to incorrect matches
   - Users may have connections at subsidiaries not matched to parent companies
   - Ambiguous company names may cause false positives

2. **Performance Impact**:
   - Connection processing may be resource-intensive
   - Large networks may require significant processing time
   - API rate limits may delay data refreshes

### Mitigation Strategies

1. **For API Limitations**:
   - Implement aggressive caching to reduce API calls
   - Use background processing to stay within rate limits
   - Consider a hybrid approach with manual data enhancement

2. **For Matching Accuracy**:
   - Implement confidence thresholds for matches
   - Allow users to manually confirm ambiguous matches
   - Build a company alias database to improve matching

3. **For Performance Impact**:
   - Process connections in small batches
   - Implement incremental updates rather than full refreshes
   - Prioritize processing for active users

## LinkedIn CSV Import Feature

Due to LinkedIn API limitations (particularly the inability to access connections data beyond basic profile information), we've implemented a robust CSV import solution to enable users to extract value from their LinkedIn network within SheetGPT.

### CSV Import Workflow

1. **Export From LinkedIn**:
   - User navigates to LinkedIn Data Export
   - Selects "Connections" data
   - Downloads the CSV file containing their connections

2. **Import to SheetGPT**:
   - User uploads the LinkedIn CSV file through the LinkedInCSVImport component
   - System parses the CSV data with flexible column mapping (handles different LinkedIn export formats)
   - Contact records are created with first name, last name, email, company, position, and connected date
   - System automatically attempts to match company names with brands in the database
   - Import statistics are displayed showing successful imports, duplicates, and brand matches

3. **Contact Management**:
   - Contacts are displayed in a dedicated Contacts page with filtering and search
   - Users can view contact details including associated brands
   - Contact-brand associations include confidence scoring from the fuzzy matching
   - Users can manually edit contact details and brand associations

### Technical Implementation

#### Database Models

```python
class Contact(TimestampedBase):
    """Model for LinkedIn contacts imported from CSV."""
    
    __tablename__ = "contacts"
    __table_args__ = (
        Index('ix_contacts_first_name', 'first_name'),
        Index('ix_contacts_last_name', 'last_name'),
        Index('ix_contacts_email', 'email'),
        Index('ix_contacts_company', 'company'),
    )

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )
    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True
    )
    linkedin_url: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    company: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True
    )
    position: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    connected_on: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    
    # Relationship to user
    user: Mapped["User"] = relationship(
        "User",
        back_populates="contacts"
    )
    
    # Relationship to brands through association
    brand_associations: Mapped[List["ContactBrandAssociation"]] = relationship(
        "ContactBrandAssociation",
        back_populates="contact",
        cascade="all, delete-orphan"
    )

class ContactBrandAssociation(TimestampedBase):
    """Association model between contacts and brands with confidence scoring."""
    
    __tablename__ = "contact_brand_associations"
    __table_args__ = (
        UniqueConstraint('contact_id', 'brand_id', name='uq_contact_brand'),
    )
    
    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    contact_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        ForeignKey("contacts.id"),
        nullable=False,
        index=True
    )
    brand_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        ForeignKey("brands.id"),
        nullable=False,
        index=True
    )
    confidence_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )
    match_type: Mapped[str] = mapped_column(
        String(20),  # 'auto', 'manual', 'verified'
        nullable=False,
        default='auto'
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    
    # Relationships
    contact: Mapped["Contact"] = relationship(
        "Contact",
        back_populates="brand_associations"
    )
    brand: Mapped["Brand"] = relationship(
        "Brand",
        back_populates="contact_associations"
    )
```

#### Import Service Implementation

```python
class ContactsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def import_linkedin_csv(
        self, 
        user_id: UUID, 
        csv_data: List[Dict[str, str]],
        auto_match_brands: bool = True,
        match_threshold: float = 0.6
    ) -> Dict[str, Any]:
        """Import contacts from LinkedIn CSV export."""
        # Initialize tracking variables
        stats = {
            "total": len(csv_data),
            "imported": 0,
            "skipped": 0,
            "duplicates": 0,
            "brand_matches": 0,
            "errors": []
        }
        
        brands_cache = {} if auto_match_brands else None
        
        # Process each row in the CSV
        for row in csv_data:
            try:
                # Extract basic contact fields with flexible mapping
                first_name = self._extract_field(row, ["First Name", "first_name", "firstname"])
                last_name = self._extract_field(row, ["Last Name", "last_name", "lastname"])
                
                # Skip if missing required fields
                if not first_name or not last_name:
                    stats["skipped"] += 1
                    stats["errors"].append(f"Missing required fields for: {row}")
                    continue
                
                # Check for duplicates
                existing = await self._find_existing_contact(user_id, first_name, last_name)
                if existing:
                    stats["duplicates"] += 1
                    continue
                
                # Extract optional fields
                email = self._extract_field(row, ["Email Address", "email", "email_address"])
                linkedin_url = self._extract_field(row, ["Profile URL", "linkedin_url", "url"])
                company = self._extract_field(row, ["Company", "company_name", "organization"])
                position = self._extract_field(row, ["Position", "job_title", "title"])
                connected_on_str = self._extract_field(row, ["Connected On", "connection_date"])
                
                # Parse connected_on date
                connected_on = None
                if connected_on_str:
                    try:
                        # Handle different date formats
                        connected_on = parse_date(connected_on_str)
                    except ValueError:
                        pass
                
                # Create new contact
                contact_data = {
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": email,
                    "linkedin_url": linkedin_url,
                    "company": company,
                    "position": position,
                    "connected_on": connected_on
                }
                
                # Create the contact record
                contact = await self.create_contact(user_id, ContactCreate(**contact_data))
                stats["imported"] += 1
                
                # Attempt brand matching if enabled and company name exists
                if auto_match_brands and company:
                    matches = await self._match_company_to_brands(
                        company, 
                        match_threshold,
                        brands_cache
                    )
                    
                    # Create brand associations for matches
                    for brand_id, score in matches:
                        await self.create_brand_association(
                            contact.id,
                            brand_id,
                            confidence_score=score
                        )
                        stats["brand_matches"] += 1
                
            except Exception as e:
                stats["errors"].append(f"Error processing row: {e}")
                stats["skipped"] += 1
        
        return stats
    
    def _extract_field(self, row: Dict[str, str], possible_keys: List[str]) -> Optional[str]:
        """Flexibly extract a field value using multiple possible column names."""
        for key in possible_keys:
            if key in row and row[key]:
                return row[key].strip()
        return None
    
    async def _find_existing_contact(
        self, 
        user_id: UUID, 
        first_name: str, 
        last_name: str
    ) -> Optional[Contact]:
        """Check if a contact already exists for this user."""
        query = select(Contact).where(
            Contact.user_id == user_id,
            func.lower(Contact.first_name) == first_name.lower(),
            func.lower(Contact.last_name) == last_name.lower()
        )
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def _match_company_to_brands(
        self,
        company_name: str,
        threshold: float = 0.6,
        brands_cache: Optional[Dict[str, List[Brand]]] = None
    ) -> List[Tuple[UUID, float]]:
        """Match company name to brands using fuzzy matching."""
        matches = []
        
        # Get all brands if not cached
        if brands_cache is None:
            query = select(Brand)
            result = await self.db.execute(query)
            brands = result.scalars().all()
        else:
            if "all" not in brands_cache:
                query = select(Brand)
                result = await self.db.execute(query)
                brands_cache["all"] = result.scalars().all()
            brands = brands_cache["all"]
        
        # Normalize company name
        normalized_name = self._normalize_company_name(company_name)
        
        # Attempt exact match first (case-insensitive)
        exact_matches = []
        for brand in brands:
            if normalized_name == self._normalize_company_name(brand.name):
                exact_matches.append((brand.id, 1.0))
        
        if exact_matches:
            return exact_matches
            
        # Perform fuzzy matching
        for brand in brands:
            score = self._calculate_company_match_score(normalized_name, brand.name)
            if score >= threshold:
                matches.append((brand.id, score))
        
        # Sort by score descending and return top matches
        return sorted(matches, key=lambda x: x[1], reverse=True)[:3]
    
    def _normalize_company_name(self, name: str) -> str:
        """Normalize company name for better matching."""
        if not name:
            return ""
            
        # Convert to lowercase
        name = name.lower()
        
        # Remove common suffixes
        suffixes = [" inc", " incorporated", " llc", " ltd", " limited", 
                   " corp", " corporation", " co", " company"]
        for suffix in suffixes:
            if name.endswith(suffix):
                name = name[:-len(suffix)]
        
        # Remove punctuation and standardize spacing
        name = re.sub(r'[^\w\s]', '', name)
        name = re.sub(r'\s+', ' ', name).strip()
        
        return name
    
    def _calculate_company_match_score(self, name1: str, name2: str) -> float:
        """Calculate match score between two company names."""
        if not name1 or not name2:
            return 0.0
            
        # Normalize name2
        name2 = self._normalize_company_name(name2)
        
        # Calculate various similarity metrics
        ratio = fuzz.ratio(name1, name2) / 100.0
        partial_ratio = fuzz.partial_ratio(name1, name2) / 100.0
        token_sort_ratio = fuzz.token_sort_ratio(name1, name2) / 100.0
        token_set_ratio = fuzz.token_set_ratio(name1, name2) / 100.0
        
        # Weighted average of different metrics
        score = (
            ratio * 0.2 + 
            partial_ratio * 0.3 + 
            token_sort_ratio * 0.2 + 
            token_set_ratio * 0.3
        )
        
        return score
```

#### Frontend Implementation - LinkedInCSVImport.tsx

The frontend implementation includes three main components:

1. **LinkedInCSVImport**: For uploading and processing CSV files
2. **ContactsList**: For displaying and filtering contacts
3. **ContactDetail**: For viewing and editing contact details

```tsx
// LinkedInCSVImport.tsx
import React, { useRef, useState } from 'react';
import { useApiClient } from '../../hooks/useApiClient';
import { useNotification } from '../../contexts/NotificationContext';
import { Button, FileInput, ProgressBar, Checkbox, Slider } from '../ui';

interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  duplicates: number;
  brand_matches: number;
  errors: string[];
}

interface LinkedInCSVImportProps {
  onImportComplete?: (stats: ImportStats) => void;
}

const LinkedInCSVImport: React.FC<LinkedInCSVImportProps> = ({ onImportComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiClient = useApiClient();
  const { showNotification } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [matchBrands, setMatchBrands] = useState(true);
  const [matchThreshold, setMatchThreshold] = useState(0.6);
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.name.endsWith('.csv')) {
      showNotification('error', 'Please upload a CSV file');
      return;
    }
    
    try {
      setLoading(true);
      
      // Read the file
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        
        // Send to API for processing
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await apiClient.post<ImportStats>(
          `/api/v1/contacts/import/linkedin?auto_match_brands=${matchBrands}&match_threshold=${matchThreshold}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        
        setImportStats(response.data);
        showNotification(
          'success', 
          `Successfully imported ${response.data.imported} contacts with ${response.data.brand_matches} brand matches`
        );
        
        if (onImportComplete) {
          onImportComplete(response.data);
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing CSV:', error);
      showNotification('error', `Failed to import contacts: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="linkedin-csv-import">
      <h2>Import LinkedIn Connections</h2>
      <p>Upload a CSV file exported from LinkedIn to import your connections.</p>
      
      <div className="import-options">
        <div className="option">
          <Checkbox
            id="match-brands"
            label="Automatically match companies to brands"
            checked={matchBrands}
            onChange={(e) => setMatchBrands(e.target.checked)}
          />
        </div>
        
        {matchBrands && (
          <div className="option">
            <label>Match threshold: {matchThreshold}</label>
            <Slider
              min={0.1}
              max={1.0}
              step={0.05}
              value={matchThreshold}
              onChange={(value) => setMatchThreshold(value)}
            />
            <small>Higher values require closer matches</small>
          </div>
        )}
      </div>
      
      <FileInput
        ref={fileInputRef}
        accept=".csv"
        onChange={handleFileSelect}
        label="Select LinkedIn CSV file"
      />
      
      {loading && <ProgressBar />}
      
      {importStats && (
        <div className="import-results">
          <h3>Import Results</h3>
          <ul>
            <li>Total records: {importStats.total}</li>
            <li>Successfully imported: {importStats.imported}</li>
            <li>Duplicates skipped: {importStats.duplicates}</li>
            <li>Errors: {importStats.skipped}</li>
            <li>Brand matches created: {importStats.brand_matches}</li>
          </ul>
          
          {importStats.errors.length > 0 && (
            <div className="import-errors">
              <h4>Errors</h4>
              <ul>
                {importStats.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LinkedInCSVImport;
```

### Benefits Over API Approach

The CSV import approach offers several advantages over direct API integration:

1. **Complete Data Access**:
   - LinkedIn's API severely restricts access to connections data
   - CSV export provides comprehensive connection information including company and position

2. **No Rate Limiting**:
   - API approach limited by strict LinkedIn rate limits (typically 100 calls/day)
   - CSV import has no such limitations, allowing full processing at once

3. **Simpler Authentication**:
   - No need for OAuth flow and token management
   - No token expiration or refresh handling required

4. **Enhanced Privacy**:
   - User has explicit control over exactly what data is imported
   - No ongoing access to user's LinkedIn account required

5. **More Consistent Experience**:
   - API limitations and changes don't affect functionality
   - Allows for consistent features regardless of LinkedIn API status

### Future Enhancements

1. **Incremental Updates**:
   - Allow importing new connections while preserving existing ones
   - Support for updating contact information from newer exports

2. **Enhanced Brand Matching**:
   - Improve company name normalization for better matching
   - Support for matching against company aliases and subsidiaries

3. **Visualization Components**:
   - Add network visualization for contact-brand relationships
   - Create dashboard view of connection statistics

4. **Intelligent Suggestions**:
   - Recommend brands based on contact company patterns
   - Suggest potential data errors or inconsistencies

5. **Additional Import Sources**:
   - Support for other CRM exports (Salesforce, HubSpot, etc.)
   - Email contact import integration

---

Document Version: 1.1.0  
Last Updated: April 22, 2025  
Author: SheetGPT Development Team
