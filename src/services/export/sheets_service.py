from typing import Optional, Dict, Any, List
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
            if os.path.exists(token_path):
                with open(token_path, 'r') as token:
                    creds_data = json.load(token)
                    self.credentials = Credentials.from_authorized_user_info(creds_data, SCOPES)

                if self.credentials and self.credentials.valid:
                    self.service = build('sheets', 'v4', credentials=self.credentials)
                    return True
                elif self.credentials and self.credentials.expired and self.credentials.refresh_token:
                    self.credentials.refresh(Request())
                    with open(token_path, 'w') as token:
                        token.write(self.credentials.to_json())
                    self.service = build('sheets', 'v4', credentials=self.credentials)
                    return True
            return False
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize from token: {str(e)}"
            )

    async def create_spreadsheet(self, title: str) -> str:
        """Create a new spreadsheet and return its ID."""
        if not self.service:
            raise HTTPException(
                status_code=500,
                detail="Service not initialized"
            )
            
        try:
            spreadsheet = {
                'properties': {
                    'title': title
                }
            }
            request = self.service.spreadsheets().create(body=spreadsheet)
            response = request.execute()
            return response['spreadsheetId']
        except Exception as e:
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
        data: Optional[List[List[Any]]] = None
    ) -> Dict[str, Any]:
        """Create a new spreadsheet using a template and optionally populate it with data."""
        if not self.service:
            raise HTTPException(
                status_code=500,
                detail="Service not initialized"
            )
            
        try:
            # Create the spreadsheet
            spreadsheet_id = await self.create_spreadsheet(title)
            
            # Apply template formatting
            if data:
                # Calculate ranges based on data size
                header_range = f"A1:{chr(65 + len(data[0]) - 1)}1"
                data_range = f"A2:{chr(65 + len(data[0]) - 1)}{len(data) + 1}"
                
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
                if alternate_format:
                    for i in range(3, len(data) + 1, 2):  # Start from row 3 (second data row)
                        alt_range = f"A{i}:{chr(65 + len(data[0]) - 1)}{i}"
                        await self.format_range(spreadsheet_id, alt_range, alternate_format)
                
                # Update the data
                await self.update_values(
                    spreadsheet_id=spreadsheet_id,
                    range_name=f"A1:{chr(65 + len(data[0]) - 1)}{len(data)}",
                    values=data
                )
            
            return {
                "spreadsheet_id": spreadsheet_id,
                "title": title,
                "template": template_name
            }
            
        except Exception as e:
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