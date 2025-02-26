from typing import Optional, Dict, Any, List, Tuple
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import os.path
import json
from fastapi import HTTPException
from urllib.parse import urlencode

from .template_service import SheetTemplate

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

class GoogleSheetsService:
    def __init__(self):
        self.credentials = None
        self.service = None
        self.flow = None
        self.template_service = SheetTemplate()
        
    def create_authorization_url(self, credentials_path: str, redirect_uri: str) -> str:
        """Create authorization URL for OAuth2 flow."""
        self.flow = Flow.from_client_secrets_file(
            credentials_path,
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        return self.flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )[0]

    async def process_oauth_callback(self, code: str, token_path: str) -> None:
        """Process OAuth callback and save credentials."""
        if not self.flow:
            raise HTTPException(
                status_code=500,
                detail="OAuth flow not initialized"
            )
        
        try:
            self.flow.fetch_token(code=code)
            self.credentials = self.flow.credentials
            
            # Save credentials
            with open(token_path, 'w') as token:
                token.write(self.credentials.to_json())
                
            # Initialize service
            self.service = build('sheets', 'v4', credentials=self.credentials)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process OAuth callback: {str(e)}"
            )

    async def initialize_from_token(self, token_path: str) -> bool:
        """Initialize service from saved token."""
        try:
            print(f"DEBUG: Initializing from token: {token_path}")
            if os.path.exists(token_path):
                print(f"DEBUG: Token file exists")
                with open(token_path, 'r') as token:
                    creds_data = json.load(token)
                    print(f"DEBUG: Loaded token data with keys: {list(creds_data.keys())}")
                    self.credentials = Credentials.from_authorized_user_info(creds_data, SCOPES)
                    print(f"DEBUG: Created credentials object")

                if self.credentials and self.credentials.valid:
                    print(f"DEBUG: Credentials are valid")
                    self.service = build('sheets', 'v4', credentials=self.credentials)
                    print(f"DEBUG: Built service")
                    return True
                elif self.credentials and self.credentials.expired and self.credentials.refresh_token:
                    print(f"DEBUG: Credentials expired, refreshing")
                    self.credentials.refresh(Request())
                    print(f"DEBUG: Credentials refreshed")
                    with open(token_path, 'w') as token:
                        token.write(self.credentials.to_json())
                        print(f"DEBUG: Saved refreshed token")
                    self.service = build('sheets', 'v4', credentials=self.credentials)
                    print(f"DEBUG: Built service after refresh")
                    return True
                else:
                    print(f"DEBUG: Credentials invalid or missing refresh token")
                    print(f"DEBUG: Valid: {self.credentials.valid if self.credentials else 'No credentials'}")
                    print(f"DEBUG: Expired: {self.credentials.expired if self.credentials else 'No credentials'}")
                    print(f"DEBUG: Has refresh token: {bool(self.credentials.refresh_token) if self.credentials else 'No credentials'}")
            else:
                print(f"DEBUG: Token file does not exist: {token_path}")
            return False
        except Exception as e:
            print(f"DEBUG: Error in initialize_from_token: {str(e)}")
            print(f"DEBUG: Error type: {type(e)}")
            import traceback
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize from token: {str(e)}"
            )

    async def create_spreadsheet(self, title: str, user_id: Optional[Any] = None) -> Tuple[str, str]:
        """Create a new spreadsheet and return its ID and URL."""
        if not self.service:
            print(f"DEBUG: Service not initialized in create_spreadsheet")
            raise HTTPException(
                status_code=500,
                detail="Service not initialized"
            )
            
        try:
            print(f"DEBUG: Creating spreadsheet with title: {title}")
            spreadsheet = {
                'properties': {
                    'title': title
                }
            }
            print(f"DEBUG: Calling spreadsheets().create() API")
            request = self.service.spreadsheets().create(body=spreadsheet)
            print(f"DEBUG: Executing API request")
            response = request.execute()
            print(f"DEBUG: API response: {response}")
            spreadsheet_id = response['spreadsheetId']
            spreadsheet_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}"
            return spreadsheet_id, spreadsheet_url
        except Exception as e:
            print(f"DEBUG: Error in create_spreadsheet: {str(e)}")
            print(f"DEBUG: Error type: {type(e)}")
            import traceback
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create spreadsheet: {str(e)}"
            )

    async def update_values(
        self,
        spreadsheet_id: str,
        range_name: str,
        values: List[List[Any]],
        value_input_option: str = 'USER_ENTERED'
    ) -> Dict[str, Any]:
        """Update values in a spreadsheet."""
        try:
            body = {
                'values': values
            }
            request = self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=range_name,
                valueInputOption=value_input_option,
                body=body
            )
            response = request.execute()
            return response
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update spreadsheet: {str(e)}")

    async def get_values(
        self,
        spreadsheet_id: str,
        range_name: str
    ) -> List[List[Any]]:
        """Get values from a spreadsheet."""
        try:
            request = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=range_name
            )
            response = request.execute()
            return response.get('values', [])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read spreadsheet: {str(e)}")

    async def format_range(
        self,
        spreadsheet_id: str,
        range_name: str,
        format_json: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply formatting to a range in the spreadsheet."""
        try:
            requests = [{
                'repeatCell': {
                    'range': range_name,
                    'cell': {'userEnteredFormat': format_json},
                    'fields': 'userEnteredFormat'
                }
            }]
            body = {'requests': requests}
            request = self.service.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id,
                body=body
            )
            response = request.execute()
            return response
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to format spreadsheet: {str(e)}")

    async def create_spreadsheet_with_template(
        self,
        title: str,
        template_name: str = "default",
        data: Optional[List[List[Any]]] = None,
        user_id: Optional[Any] = None
    ) -> Dict[str, Any]:
        """Create a new spreadsheet using a template and optionally populate it with data."""
        if not self.service:
            print(f"DEBUG: Service not initialized in create_spreadsheet_with_template")
            raise HTTPException(
                status_code=500,
                detail="Service not initialized"
            )
            
        try:
            # Create the spreadsheet
            print(f"DEBUG: Creating spreadsheet with title: {title}")
            spreadsheet_id, spreadsheet_url = await self.create_spreadsheet(title, user_id)
            print(f"DEBUG: Created spreadsheet with ID: {spreadsheet_id}")
            
            # Get the spreadsheet URL
            print(f"DEBUG: Spreadsheet URL: {spreadsheet_url}")
            
            # Apply template formatting
            if data:
                print(f"DEBUG: Applying template formatting to data with {len(data)} rows")
                # Calculate ranges based on data size
                header_range = f"A1:{chr(65 + len(data[0]) - 1)}1"
                data_range = f"A2:{chr(65 + len(data[0]) - 1)}{len(data) + 1}"
                
                print(f"DEBUG: Header range: {header_range}")
                print(f"DEBUG: Data range: {data_range}")
                
                # Apply header formatting
                print(f"DEBUG: Getting header formatting for template: {template_name}")
                header_format = await self.template_service.get_formatting(template_name, "header")
                if header_format:
                    print(f"DEBUG: Applying header formatting")
                    await self.format_range(spreadsheet_id, header_range, header_format)
                
                # Apply body formatting
                print(f"DEBUG: Getting body formatting for template: {template_name}")
                body_format = await self.template_service.get_formatting(template_name, "body")
                if body_format:
                    print(f"DEBUG: Applying body formatting")
                    await self.format_range(spreadsheet_id, data_range, body_format)
                
                # Apply alternate row formatting if available
                print(f"DEBUG: Getting alternate row formatting for template: {template_name}")
                alternate_format = await self.template_service.get_formatting(template_name, "alternateRow")
                if alternate_format:
                    print(f"DEBUG: Applying alternate row formatting")
                    for i in range(3, len(data) + 1, 2):  # Start from row 3 (second data row)
                        alt_range = f"A{i}:{chr(65 + len(data[0]) - 1)}{i}"
                        await self.format_range(spreadsheet_id, alt_range, alternate_format)
                
                # Update the data
                print(f"DEBUG: Updating data in spreadsheet")
                await self.update_values(
                    spreadsheet_id=spreadsheet_id,
                    range_name=f"A1:{chr(65 + len(data[0]) - 1)}{len(data)}",
                    values=data
                )
            
            print(f"DEBUG: Successfully created spreadsheet with template")
            return {
                "spreadsheet_id": spreadsheet_id,
                "spreadsheetUrl": spreadsheet_url,
                "title": title,
                "template": template_name
            }
            
        except Exception as e:
            print(f"DEBUG: Error in create_spreadsheet_with_template: {str(e)}")
            print(f"DEBUG: Error type: {type(e)}")
            import traceback
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create spreadsheet with template: {str(e)}"
            )
            
    async def apply_template_to_existing(
        self,
        spreadsheet_id: str,
        template_name: str = "default",
        data_range: Optional[str] = None
    ) -> Dict[str, Any]:
        """Apply a template to an existing spreadsheet."""
        if not self.service:
            raise HTTPException(
                status_code=500,
                detail="Service not initialized"
            )
            
        try:
            if not data_range:
                # Get the current data range
                data = await self.get_values(spreadsheet_id, "A1:ZZ")
                if not data:
                    raise HTTPException(
                        status_code=400,
                        detail="No data found in spreadsheet"
                    )
                last_col = chr(65 + len(data[0]) - 1)
                data_range = f"A1:{last_col}{len(data)}"
            
            # Split range into header and body
            header_range = f"{data_range.split(':')[0]}:{data_range.split(':')[1].replace(data_range.split(':')[1][1:], '1')}"
            body_range = f"{data_range.split(':')[0].replace('1', '2')}:{data_range.split(':')[1]}"
            
            # Apply header formatting
            header_format = await self.template_service.get_formatting(template_name, "header")
            if header_format:
                await self.format_range(spreadsheet_id, header_range, header_format)
            
            # Apply body formatting
            body_format = await self.template_service.get_formatting(template_name, "body")
            if body_format:
                await self.format_range(spreadsheet_id, body_range, body_format)
            
            # Apply alternate row formatting
            alternate_format = await self.template_service.get_formatting(template_name, "alternateRow")
            if alternate_format:
                start_row = int(body_range.split(':')[0][1:])
                end_row = int(body_range.split(':')[1][1:])
                for i in range(start_row + 1, end_row + 1, 2):
                    alt_range = f"{body_range.split(':')[0][0]}{i}:{body_range.split(':')[1][0]}{i}"
                    await self.format_range(spreadsheet_id, alt_range, alternate_format)
            
            return {
                "status": "success",
                "message": f"Template '{template_name}' applied successfully",
                "spreadsheet_id": spreadsheet_id
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to apply template: {str(e)}"
            )

    async def write_to_sheet(
        self,
        spreadsheet_id: str,
        sheet_name: str,
        headers: List[str],
        rows: List[List[Any]],
        value_input_option: str = 'USER_ENTERED'
    ) -> Dict[str, Any]:
        """Write headers and rows to a sheet."""
        try:
            # Combine headers and rows
            values = [headers] + rows
            
            # Calculate range
            range_name = f"{sheet_name}!A1:{chr(65 + len(headers) - 1)}{len(rows) + 1}"
            
            # Update values
            return await self.update_values(
                spreadsheet_id,
                range_name,
                values,
                value_input_option
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to write to sheet: {str(e)}")
    
    async def apply_formatting(
        self,
        spreadsheet_id: str,
        sheet_name: str,
        column_count: int,
        row_count: int,
        template_name: str = "default"
    ) -> Dict[str, Any]:
        """Apply formatting to a sheet."""
        try:
            # Calculate ranges
            header_range = f"{sheet_name}!A1:{chr(65 + column_count - 1)}1"
            data_range = f"{sheet_name}!A2:{chr(65 + column_count - 1)}{row_count}"
            
            # Apply header formatting
            header_format = await self.template_service.get_formatting(template_name, "header")
            if header_format:
                await self.format_range(spreadsheet_id, header_range, header_format)
            
            # Apply body formatting
            body_format = await self.template_service.get_formatting(template_name, "body")
            if body_format:
                await self.format_range(spreadsheet_id, data_range, body_format)
            
            # Apply alternate row formatting if available
            alternate_format = await self.template_service.get_formatting(template_name, "alternateRow")
            if alternate_format and row_count > 2:
                # Apply to even rows (starting from row 3, which is index 2)
                for i in range(3, row_count + 1, 2):
                    alt_range = f"{sheet_name}!A{i}:{chr(65 + column_count - 1)}{i}"
                    await self.format_range(spreadsheet_id, alt_range, alternate_format)
            
            return {"status": "success"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to apply formatting: {str(e)}") 