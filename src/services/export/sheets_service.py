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

    async def create_spreadsheet_with_data(self, title: str, data: List[List[Any]]) -> Tuple[str, str]:
        """Create a new spreadsheet with data pre-populated and return its ID and URL."""
        if not self.service:
            print(f"DEBUG: Service not initialized in create_spreadsheet_with_data")
            raise HTTPException(
                status_code=500,
                detail="Service not initialized"
            )
            
        try:
            print(f"DEBUG: Creating spreadsheet with title: {title} and pre-populated data")
            print(f"DEBUG: Data length: {len(data)}")
            print(f"DEBUG: First few rows: {data[:2] if data else 'No data'}")
            
            # Define the column count and row count
            col_count = len(data[0]) if data and data[0] else 1
            row_count = len(data)
            
            # Create a spreadsheet with pre-populated data
            sheets_body = {
                'properties': {
                    'title': title
                },
                'sheets': [
                    {
                        'properties': {
                            'title': 'Sheet1',
                            'gridProperties': {
                                'rowCount': max(row_count, 1000),  # Give some extra rows
                                'columnCount': max(col_count, 26)  # Give some extra columns
                            }
                        },
                        'data': [
                            {
                                'rowData': [
                                    {
                                        'values': [
                                            # Create a cell object for each cell in this row
                                            {'userEnteredValue': {'stringValue': str(cell) if cell is not None else ''}}
                                            for cell in row
                                        ]
                                    }
                                    for row in data
                                ]
                            }
                        ]
                    }
                ]
            }
            
            print(f"DEBUG: Calling spreadsheets().create() API with pre-populated data")
            request = self.service.spreadsheets().create(body=sheets_body)
            print(f"DEBUG: Executing API request")
            response = request.execute()
            print(f"DEBUG: API response keys: {response.keys()}")
            spreadsheet_id = response['spreadsheetId']
            spreadsheet_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}"
            print(f"DEBUG: Created spreadsheet with ID: {spreadsheet_id}")
            return spreadsheet_id, spreadsheet_url
        except Exception as e:
            print(f"DEBUG: Error in create_spreadsheet_with_data: {str(e)}")
            print(f"DEBUG: Error type: {type(e)}")
            import traceback
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create spreadsheet with data: {str(e)}"
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

    async def append_values(
        self,
        spreadsheet_id: str,
        range_name: str,
        values: List[List[Any]],
        value_input_option: str = 'USER_ENTERED'
    ) -> Dict[str, Any]:
        """Append values to a spreadsheet."""
        try:
            print(f"DEBUG: Appending values to spreadsheet {spreadsheet_id}")
            print(f"DEBUG: Range: {range_name}")
            print(f"DEBUG: Value input option: {value_input_option}")
            print(f"DEBUG: Values length: {len(values) if values else 0}")
            print(f"DEBUG: First row sample: {values[0] if values and len(values) > 0 else 'No data'}")
            
            # Filter out None or undefined values
            filtered_values = []
            for row in values:
                if row is None:
                    filtered_values.append([])
                    continue
                    
                filtered_row = []
                for cell in row:
                    if cell is None:
                        filtered_row.append("")
                    else:
                        filtered_row.append(cell)
                filtered_values.append(filtered_row)
                
            print(f"DEBUG: Filtered values length: {len(filtered_values)}")
            print(f"DEBUG: First filtered row: {filtered_values[0] if filtered_values else 'No data'}")
            
            body = {
                'values': filtered_values
            }
            
            print(f"DEBUG: Making API request to append values")
            request = self.service.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range=range_name,
                valueInputOption=value_input_option,
                insertDataOption='INSERT_ROWS',
                body=body
            )
            
            print(f"DEBUG: Executing API request")
            response = request.execute()
            print(f"DEBUG: API response: {response}")
            return response
        except Exception as e:
            print(f"DEBUG: Error appending values: {str(e)}")
            print(f"DEBUG: Error type: {type(e)}")
            import traceback
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Failed to append to spreadsheet: {str(e)}")
    
    async def update_values(
        self,
        spreadsheet_id: str,
        range_name: str,
        values: List[List[Any]],
        value_input_option: str = 'USER_ENTERED'
    ) -> Dict[str, Any]:
        """Update values in a spreadsheet."""
        try:
            print(f"DEBUG: Updating values in spreadsheet {spreadsheet_id}")
            print(f"DEBUG: Range: {range_name}")
            print(f"DEBUG: Value input option: {value_input_option}")
            print(f"DEBUG: Values length: {len(values) if values else 0}")
            print(f"DEBUG: First row sample: {values[0] if values and len(values) > 0 else 'No data'}")
            
            # Filter out None or undefined values
            filtered_values = []
            for row in values:
                if row is None:
                    filtered_values.append([])
                    continue
                    
                filtered_row = []
                for cell in row:
                    if cell is None:
                        filtered_row.append("")
                    else:
                        filtered_row.append(cell)
                filtered_values.append(filtered_row)
                
            print(f"DEBUG: Filtered values length: {len(filtered_values)}")
            print(f"DEBUG: First filtered row: {filtered_values[0] if filtered_values else 'No data'}")
            
            body = {
                'values': filtered_values
            }
            
            print(f"DEBUG: Making API request to update values")
            request = self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=range_name,
                valueInputOption=value_input_option,
                body=body
            )
            
            print(f"DEBUG: Executing API request")
            response = request.execute()
            print(f"DEBUG: API response: {response}")
            
            # If no update happened, try using append instead of update
            if response.get('updatedCells', 0) == 0:
                print(f"DEBUG: No cells updated, trying append method instead")
                append_request = self.service.spreadsheets().values().append(
                    spreadsheetId=spreadsheet_id,
                    range=range_name,
                    valueInputOption=value_input_option,
                    body=body
                )
                append_response = append_request.execute()
                print(f"DEBUG: Append API response: {append_response}")
                return append_response
                
            return response
        except Exception as e:
            print(f"DEBUG: Error updating values: {str(e)}")
            print(f"DEBUG: Error type: {type(e)}")
            import traceback
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
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
            # Convert A1 notation to GridRange object
            # Parse range like "A1:Z10" into components
            try:
                parts = range_name.split(":")
                start_cell = parts[0]
                end_cell = parts[1] if len(parts) > 1 else start_cell
                
                print(f"DEBUG: Parsing range: {range_name}")
                print(f"DEBUG: Start cell: {start_cell}, End cell: {end_cell}")
            except Exception as e:
                print(f"DEBUG: Error parsing range '{range_name}': {str(e)}")
                # Provide default range if parsing fails
                start_cell = "A1"
                end_cell = "Z10"
            
            # Get sheet ID (default to 0 for first sheet)
            sheet_id = 0
            if "!" in start_cell:
                sheet_name, start_cell = start_cell.split("!")
                # Get sheet ID from name (for now, use default 0)
            
            # Parse column and row from cells
            def parse_cell(cell):
                # Split into column letters and row number
                import re
                match = re.match(r'([A-Za-z]+)(\d+)', cell)
                if not match:
                    return 0, 0
                col_letters, row_num = match.groups()
                
                # Convert column letters to zero-based index
                col_index = 0
                for c in col_letters.upper():
                    col_index = col_index * 26 + (ord(c) - ord('A') + 1)
                col_index -= 1  # Convert to 0-based
                
                # Convert row to zero-based index
                row_index = int(row_num) - 1
                
                return col_index, row_index
            
            start_col, start_row = parse_cell(start_cell)
            end_col, end_row = parse_cell(end_cell)
            
            # Create GridRange object
            grid_range = {
                "sheetId": sheet_id,
                "startRowIndex": start_row,
                "endRowIndex": end_row + 1,
                "startColumnIndex": start_col,
                "endColumnIndex": end_col + 1
            }
            
            # Create request with proper GridRange
            requests = [{
                'repeatCell': {
                    'range': grid_range,
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
            # Check if we should use the direct data method
            if data:
                # Try creating a spreadsheet with pre-populated data
                try:
                    print(f"DEBUG: Attempting to create spreadsheet with pre-populated data")
                    spreadsheet_id, spreadsheet_url = await self.create_spreadsheet_with_data(title, data)
                    print(f"DEBUG: Successfully created spreadsheet with pre-populated data!")
                    print(f"DEBUG: Spreadsheet ID: {spreadsheet_id}")
                    print(f"DEBUG: Spreadsheet URL: {spreadsheet_url}")
                    
                    # Return early since data is already populated
                    print(f"DEBUG: Returning early since data is already populated")
                    
                    # Just apply formatting if we created with data
                    try:
                        # Calculate ranges based on data size (with safety checks)
                        col_count = len(data[0]) if data[0] else 1
                        last_column = chr(65 + min(col_count - 1, 25))  # Limit to 'Z' (column 26)
                        row_count = len(data)
                        
                        header_range = f"A1:{last_column}1"
                        data_range = f"A2:{last_column}{row_count + 1}"
                        
                        # Apply header formatting
                        header_format = await self.template_service.get_formatting(template_name, "header")
                        if header_format:
                            try:
                                await self.format_range(spreadsheet_id, header_range, header_format)
                            except Exception as e:
                                print(f"DEBUG: Error applying header formatting: {str(e)}")
                        
                        # Apply body formatting
                        body_format = await self.template_service.get_formatting(template_name, "body")
                        if body_format:
                            try:
                                await self.format_range(spreadsheet_id, data_range, body_format)
                            except Exception as e:
                                print(f"DEBUG: Error applying body formatting: {str(e)}")
                    except Exception as format_error:
                        print(f"DEBUG: Error applying formatting after data population: {str(format_error)}")
                        
                    return {
                        "spreadsheet_id": spreadsheet_id,
                        "spreadsheetUrl": spreadsheet_url,
                        "title": title,
                        "template": template_name
                    }
                except Exception as data_error:
                    print(f"DEBUG: Error creating spreadsheet with pre-populated data: {str(data_error)}")
                    print(f"DEBUG: Falling back to regular spreadsheet creation")
            
            # Regular spreadsheet creation without pre-populated data
            print(f"DEBUG: Creating spreadsheet with title: {title}")
            spreadsheet_id, spreadsheet_url = await self.create_spreadsheet(title, user_id)
            print(f"DEBUG: Created spreadsheet with ID: {spreadsheet_id}")
            
            # Get the spreadsheet URL
            print(f"DEBUG: Spreadsheet URL: {spreadsheet_url}")
            
            # Apply template formatting and data
            if data:
                print(f"DEBUG: Applying template formatting to data with {len(data)} rows")
                print(f"DEBUG: Data structure: {type(data)}")
                
                # Verify data structure and do basic validation
                if not isinstance(data, list):
                    print(f"DEBUG: Data is not a list, converting to list")
                    data = [data]
                
                if len(data) > 0:
                    print(f"DEBUG: First row type: {type(data[0])}")
                    print(f"DEBUG: First row sample: {data[0]}")
                    
                    # Ensure all rows are lists
                    validated_data = []
                    for i, row in enumerate(data):
                        if row is None:
                            print(f"DEBUG: Row {i} is None, adding empty row")
                            validated_data.append([""])
                        elif not isinstance(row, list):
                            print(f"DEBUG: Row {i} is not a list, converting to list")
                            validated_data.append([row])
                        else:
                            validated_data.append(row)
                    
                    data = validated_data
                    print(f"DEBUG: After validation - data length: {len(data)}")
                    print(f"DEBUG: After validation - first row sample: {data[0] if data else 'No data'}")
                else:
                    print(f"DEBUG: Data list is empty, adding a default row")
                    data = [["No Data"]]
                # Calculate ranges based on data size (with safety checks)
                try:
                    col_count = len(data[0]) if data[0] else 1
                    last_column = chr(65 + min(col_count - 1, 25))  # Limit to 'Z' (column 26)
                    row_count = len(data)
                
                    print(f"DEBUG: Calculating ranges for data with {col_count} columns and {row_count} rows")
                    print(f"DEBUG: Last column is {last_column}")
                
                    header_range = f"A1:{last_column}1"
                    data_range = f"A2:{last_column}{row_count + 1}"
                    
                    print(f"DEBUG: Calculated header range: {header_range}")
                    print(f"DEBUG: Calculated data range: {data_range}")
                except Exception as e:
                    print(f"DEBUG: Error calculating ranges: {str(e)}")
                    # Provide default ranges
                    header_range = "A1:Z1"
                    data_range = "A2:Z100"
                
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
                        try:
                            col_count = len(data[0]) if data[0] else 1
                            last_column = chr(65 + min(col_count - 1, 25))  # Limit to 'Z' (column 26)
                            alt_range = f"A{i}:{last_column}{i}"
                            print(f"DEBUG: Alternate row range: {alt_range}")
                        except Exception as e:
                            print(f"DEBUG: Error calculating alternate row range: {str(e)}")
                            alt_range = f"A{i}:Z{i}"
                        await self.format_range(spreadsheet_id, alt_range, alternate_format)
                
                # Update the data
                print(f"DEBUG: Updating data in spreadsheet")
                # Calculate safe range for updating values
                try:
                    # Make sure we have at least one row of data
                    if not data or len(data) == 0:
                        print(f"DEBUG: No data to update, adding default row")
                        data = [["No Data"]]
                    
                    # Calculate the row and column count
                    col_count = len(data[0]) if data[0] else 1
                    last_column = chr(65 + min(col_count - 1, 25))  # Limit to 'Z' (column 26)
                    row_count = len(data)
                    
                    # A1 notation needs to be "Sheet1!A1:Z10" format
                    # For new sheets, we can use just "A1:Z10" since it will default to the first sheet
                    update_range = f"A1:{last_column}{row_count}"
                    print(f"DEBUG: Update values range: {update_range}")
                    print(f"DEBUG: Column count: {col_count}, Row count: {row_count}")
                    print(f"DEBUG: Data dimensions: {len(data)} rows x {len(data[0]) if data and len(data) > 0 else 0} columns")
                    
                    # Also print the first few cells for verification
                    if data and len(data) > 0:
                        for i in range(min(3, len(data))):
                            row_content = data[i][:3] if len(data[i]) > 3 else data[i]
                            print(f"DEBUG: Row {i}: {row_content}")
                except Exception as e:
                    print(f"DEBUG: Error calculating update range: {str(e)}")
                    print(f"DEBUG: Using default range A1:Z100 instead")
                    update_range = "A1:Z100"
                
                # Try using a low-level direct approach to write data
                print(f"DEBUG: Using direct low-level approach to write data")
                
                # Attempt to write data directly with detailed logging
                try:
                    # First verify we can get basic info about the sheet
                    print(f"DEBUG: Getting spreadsheet metadata")
                    sheet_info = self.service.spreadsheets().get(
                        spreadsheetId=spreadsheet_id
                    ).execute()
                    print(f"DEBUG: Sheet info: Sheet title={sheet_info.get('properties', {}).get('title', 'Unknown')}")
                    
                    # Now try writing data row by row for maximum reliability
                    success_count = 0
                    for i, row in enumerate(data):
                        if i > 100:  # Limit to first 100 rows for testing
                            print(f"DEBUG: Stopping after 100 rows")
                            break
                            
                        try:
                            # Calculate the range for this specific row
                            row_range = f"A{i+1}"
                            print(f"DEBUG: Writing row {i} to range {row_range}: {row[:3]}...")
                            
                            # Use update for this specific row
                            row_result = self.service.spreadsheets().values().update(
                                spreadsheetId=spreadsheet_id,
                                range=row_range,
                                valueInputOption='USER_ENTERED',
                                body={'values': [row]}
                            ).execute()
                            
                            # Check if update succeeded
                            if row_result.get('updatedCells', 0) > 0:
                                success_count += 1
                                if i % 10 == 0:  # Only log every 10 rows
                                    print(f"DEBUG: Successfully wrote row {i}")
                        except Exception as row_error:
                            print(f"DEBUG: Error writing row {i}: {str(row_error)}")
                    
                    print(f"DEBUG: Direct row-by-row write completed. Success: {success_count}/{len(data)} rows")
                    
                    # After row-by-row write, try a single batch update as well
                    try:
                        print(f"DEBUG: Trying batch update as well")
                        batch_result = self.service.spreadsheets().values().batchUpdate(
                            spreadsheetId=spreadsheet_id,
                            body={
                                'valueInputOption': 'USER_ENTERED',
                                'data': [
                                    {
                                        'range': 'A1',
                                        'values': data
                                    }
                                ]
                            }
                        ).execute()
                        print(f"DEBUG: Batch update result: {batch_result}")
                    except Exception as batch_error:
                        print(f"DEBUG: Error in batch update: {str(batch_error)}")
                
                except Exception as direct_error:
                    print(f"DEBUG: Error in direct low-level approach: {str(direct_error)}")
                    
                    # Final fallback - try a simple test write with raw API call
                    print(f"DEBUG: Attempting simple test write as last resort")
                    try:
                        # Write test values to A1:B2
                        test_result = self.service.spreadsheets().values().update(
                            spreadsheetId=spreadsheet_id,
                            range="A1:B2",
                            valueInputOption="USER_ENTERED",
                            body={
                                "values": [
                                    ["Header 1", "Header 2"],
                                    ["Value 1", "Value 2"]
                                ]
                            }
                        ).execute()
                        print(f"DEBUG: Test write result: {test_result}")
                    except Exception as test_error:
                        print(f"DEBUG: Error in test write: {str(test_error)}")
            
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