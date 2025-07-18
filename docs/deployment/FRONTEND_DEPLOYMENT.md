# Frontend Deployment Guide for Netlify

This guide outlines the complete process for deploying the SheetGPT frontend to Netlify, including configuration details and troubleshooting steps.

## Current Deployment Status

- **Frontend**: Deployed to Netlify at [88gpts.com/sheetgpt](https://88gpts.com/sheetgpt)
- **Backend API**: Running on Digital Ocean at [api.88gpts.com](https://api.88gpts.com)
- **Database**: PostgreSQL on Digital Ocean with SSL encryption
- **Cross-domain authentication**: Working properly with JWT tokens

## Deployment Architecture

The application uses a distributed architecture:

- **Frontend**: React SPA deployed on Netlify at a sub-path
- **Backend**: FastAPI application on Digital Ocean App Platform
- **Database**: PostgreSQL managed database on Digital Ocean
- **Authentication**: JWT-based with cross-domain support

## Configuration Details

- **Sub-path Deployment**: The application runs at `/sheetgpt` path
- **React Router**: Configured with `basename="/sheetgpt"`
- **Asset Handling**: Custom redirects in `netlify.toml`
- **CORS**: Backend configured to accept requests from the frontend domain

### Frontend Configuration (Netlify)

- Environment variables set correctly:
  - `VITE_API_URL=https://api.88gpts.com`
  - `VITE_BASE_PATH=/sheetgpt/`
  - `NODE_ENV=production`

### Key Implementation Details

#### Frontend Modifications

1. **React Router Configuration**:

   ```jsx
   <BrowserRouter basename="/sheetgpt">
     <QueryClientProvider client={queryClient}>
       <App />
     </QueryClientProvider>
   </BrowserRouter>
   ```

2. **Vite Configuration**:

   ```js
   export default defineConfig({
     plugins: [react()],
     base: process.env.VITE_BASE_PATH || '/',
     // Other configuration...
   });
   ```

3. **Netlify Redirects**:

   ```toml
   # Handle static assets correctly
   [[redirects]]
     from = "/sheetgpt/assets/*"
     to = "/assets/:splat"
     status = 200

   # Handle all routes under /sheetgpt/ for SPA
   [[redirects]]
     from = "/sheetgpt/*"
     to = "/index.html"
     status = 200
   ```

#### Backend Modifications

1. **CORS Configuration**:

   ```python
   # CORS settings - allow frontend domain and local development
   CORS_ORIGINS: List[str] = [
       "https://www.88gpts.com",   
       "https://88gpts.com",       
       "https://api.88gpts.com",   
       "https://www.88gpts.com/sheetgpt",   # New app location
       "https://88gpts.com/sheetgpt",       # Without www
       # Development origins...
   ]
   ```

## Benefits of Sub-path Deployment

1. **Future Homepage**: Allows for a separate homepage at the root domain
2. **Multiple Applications**: Supports hosting multiple apps on the same domain
3. **Organizational Structure**: Creates a clearer URL structure for different services
4. **Separate Deployments**: Frontend and backend can be deployed independently

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

## Conclusion

The SheetGPT frontend is now successfully deployed at 88gpts.com/sheetgpt, with the backend API at api.88gpts.com. This configuration allows for future development of a separate homepage at the root domain while maintaining the current application functionality.

Updated: April 18, 2025
