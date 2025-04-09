# Frontend Deployment Guide for Netlify

This guide outlines the current deployment of the SheetGPT frontend on Netlify, working with the backend API on Digital Ocean.

## Architecture Overview

- **Backend API**: Deployed at `https://api.88gpts.com` on Digital Ocean
- **Frontend**: Deployed at `https://88gpts.com/sheetgpt` on Netlify
- **Database**: PostgreSQL managed by Digital Ocean

## Configuration Details

- **Sub-path Deployment**: The application runs at `/sheetgpt` path
- **React Router**: Configured with `basename="/sheetgpt"`
- **Asset Handling**: Custom redirects in `netlify.toml`
- **CORS**: Backend configured to accept requests from the new URL path
## Key Implementation Details

### Frontend Modifications

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

### Backend Modifications

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









## Conclusion

The SheetGPT frontend is now successfully deployed at 88gpts.com/sheetgpt, with the backend API at api.88gpts.com. This configuration allows for future development of a separate homepage at the root domain while maintaining the current application functionality.


