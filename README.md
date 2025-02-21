# SheetGPT

## Google Sheets Integration Setup

To use the Google Sheets integration, follow these steps:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API for your project
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application" as the application type
   - Set the name to "SheetGPT" (or your preferred name)
   - Add Authorized JavaScript origins:
     * `http://localhost:8000` (for development)
   - Add Authorized redirect URIs:
     * `http://localhost:8000/api/v1/export/auth/callback`
     * `http://localhost:8000/callback` (for development)
   - Click "Create" and download the credentials JSON file
5. Place the downloaded credentials file at `credentials/google_sheets_credentials.json`

### Environment Variables

Configure the following environment variables for Google Sheets integration:

```env
GOOGLE_SHEETS_CREDENTIALS_PATH=credentials/google_sheets_credentials.json
GOOGLE_SHEETS_TOKEN_PATH=credentials/token.json
GOOGLE_SHEETS_BATCH_SIZE=100
GOOGLE_SHEETS_MAX_RETRIES=3
GOOGLE_SHEETS_TIMEOUT=30
```

### Security Note

The credentials file contains sensitive information. Make sure to:
- Never commit the credentials file to version control
- Keep the credentials secure and restrict access
- Use environment variables for production deployments
- Regularly rotate the client secret as per your security policy 