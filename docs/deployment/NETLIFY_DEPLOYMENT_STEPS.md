# SheetGPT Deployment Guide

## Current Deployment Status

- Frontend: Deployed to Netlify at [88gpts.com/sheetgpt](https://88gpts.com/sheetgpt)
- Backend API: Running on Digital Ocean at [api.88gpts.com](https://api.88gpts.com)
- Database: PostgreSQL on Digital Ocean with SSL encryption
- Cross-domain authentication: Working properly with JWT tokens

## Deployment Architecture

The application uses a distributed architecture:

- **Frontend**: React SPA deployed on Netlify at a sub-path
- **Backend**: FastAPI application on Digital Ocean App Platform
- **Database**: PostgreSQL managed database on Digital Ocean
- **Authentication**: JWT-based with cross-domain support

## Configuration Details

### Frontend Configuration (Netlify)

- Running at `/sheetgpt` path instead of root domain
- Environment variables set correctly:
  - `VITE_API_URL=https://api.88gpts.com`
  - `VITE_BASE_PATH=/sheetgpt/`
  - `NODE_ENV=production`
- React Router configured with `basename="/sheetgpt"`
- Asset handling configured in `netlify.toml` for sub-path

### Backend Configuration (Digital Ocean)

- Deployed with production environment settings
- CORS configuration allows requests from:
  - `https://88gpts.com`
  - `https://88gpts.com/sheetgpt`
- SSL configured for secure API communication
- Database connection using SSL with custom context

## Future Homepage Development

The current setup supports adding a homepage at the root URL:

1. Create a new repository for homepage content
2. Deploy to 88gpts.com root (the SheetGPT app will still work at /sheetgpt)
3. Update Netlify redirects to support both sites
4. Test to ensure no interference between sites

## Troubleshooting

If you encounter issues with the sub-path deployment:

1. Check browser console for asset loading errors
2. Verify redirects are properly configured in Netlify
3. Ensure the `base` path is correctly set in Vite configuration
4. Check that all router paths are relative, not absolute
5. Validate CORS settings in the backend






