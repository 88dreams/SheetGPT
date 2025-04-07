# Netlify Deployment Steps for SheetGPT

This document outlines the remaining steps to deploy SheetGPT with the frontend on Netlify and the backend on Digital Ocean.

## Current Status

- Backend code is deployed on Digital Ocean at 88gpts.com
- Code changes have been made to:
  - Update backend CORS settings to allow requests from api.88gpts.com
  - Update frontend .env.production to point to api.88gpts.com
  - Create netlify.toml configuration file
  - Changes have been committed and pushed to the feature/production-readiness branch

## Remaining Steps

### Step 1: Set up the API subdomain for your backend

1. Log into your Digital Ocean account
2. Go to your current App Platform app (the backend)
3. Navigate to "Settings" > "Domains"
4. Add a new domain: `api.88gpts.com`
5. Digital Ocean will provide you with DNS records to set up
   - This will typically be a CNAME record pointing to your app's default domain (something like `your-app-name.ondigitalocean.app`)

### Step 2: Update DNS settings

1. Log into your domain registrar or DNS provider
2. Create a new CNAME record:
   - Name/Host: `api`
   - Value/Target: The Digital Ocean app URL from Step 1
   - TTL: 3600 (or default)
3. Keep your existing A record for 88gpts.com temporarily until Netlify is set up

### Step 3: Redeploy your backend

1. Redeploy your backend to Digital Ocean to apply the CORS changes
   - This can be done through the Digital Ocean dashboard
   - Or via a new push to your repository if you have automatic deployments set up

2. Verify the subdomain is working:
   - Once the DNS changes propagate, test accessing `https://api.88gpts.com`
   - It should show your backend API (you can check `/health` or other endpoints)

### Step 4: Set up Netlify for frontend deployment

1. Sign up for Netlify (if you haven't already): https://app.netlify.com/signup

2. Once logged in:
   - Click "New site from Git"
   - Connect to your GitHub repository
   - Select the repository containing your SheetGPT code

3. Configure build settings:
   - Base directory: `frontend` (should be automatically set by netlify.toml)
   - Build command: `npm install && npm run build` (should be automatically set by netlify.toml)
   - Publish directory: `dist` (should be automatically set by netlify.toml)

4. Configure environment variables (these should match your .env.production):
   - Click "Advanced build settings"
   - Add the following variables:
     - `VITE_API_URL`: `https://api.88gpts.com`
     - `NODE_ENV`: `production`
     - `VITE_CORS_ORIGIN`: `https://88gpts.com`

5. Deploy the site:
   - Click "Deploy site"
   - Wait for the build and deployment to complete

### Step 5: Set up custom domain on Netlify

1. Once your site is deployed:
   - Go to "Site settings" > "Domain management"
   - Click "Add custom domain"
   - Enter `88gpts.com`
   - Follow the verification process

2. Set up DNS for Netlify:
   - Netlify will provide you with specific DNS records to add
   - Go to your DNS provider
   - Add the specified records (typically CNAME or A records)
   - Remove any existing A records pointing to Digital Ocean for 88gpts.com

3. Enable HTTPS:
   - Netlify will automatically provision an SSL certificate
   - This might take a few minutes to an hour to complete

### Step 6: Test your setup

1. Wait for DNS changes to propagate (this can take a few hours)
2. Test accessing your frontend at `https://88gpts.com`
3. Verify API calls are correctly going to `https://api.88gpts.com`
4. Check browser console for any CORS errors

## Troubleshooting Common Issues

### CORS Errors
If you see CORS errors in the browser console:
- Verify the backend CORS settings include `https://88gpts.com`
- Check that the API URL in the frontend is correctly set to `https://api.88gpts.com`
- Make sure your browser isn't caching old JavaScript files (try hard refresh)

### API Connection Issues
If the frontend can't connect to the API:
- Verify DNS settings for api.88gpts.com are properly configured
- Check that the backend is accessible at api.88gpts.com
- Ensure environment variables are correctly set in Netlify

### Build Failures on Netlify
If the build fails on Netlify:
- Check the build logs for specific errors
- Verify package.json dependencies are correct
- Make sure the base directory is set correctly (`frontend`)

## After Deployment

Once everything is working correctly:
1. Set up continuous deployment workflows if desired
2. Consider setting up monitoring for both frontend and backend
3. Implement a proper backup strategy for the database
4. Document the architecture and deployment process for future reference

Your final architecture will be:
- Frontend: Netlify hosting at 88gpts.com
- Backend: Digital Ocean App Platform at api.88gpts.com
- Database: Digital Ocean Managed Database