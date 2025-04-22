#!/bin/bash
# LinkedIn Integration Setup Script

echo "LinkedIn Integration Setup"
echo "=========================="
echo

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Creating .env file..."
  touch .env
fi

# Generate encryption key if it doesn't exist
if ! grep -q "ENCRYPTION_KEY" .env || grep -q "ENCRYPTION_KEY=$" .env; then
  echo "Generating encryption key..."
  ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
  # Update the encryption key in .env
  if grep -q "ENCRYPTION_KEY=" .env; then
    sed -i '' "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|" .env
  else
    echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
  fi
  echo "Encryption key generated and added to .env"
fi

# Prompt for LinkedIn API credentials
echo
echo "Please enter your LinkedIn API credentials:"
read -p "LinkedIn Client ID: " CLIENT_ID
read -p "LinkedIn Client Secret: " CLIENT_SECRET

# Update LinkedIn credentials in .env
if grep -q "LINKEDIN_CLIENT_ID=" .env; then
  sed -i '' "s|LINKEDIN_CLIENT_ID=.*|LINKEDIN_CLIENT_ID=$CLIENT_ID|" .env
else
  echo "LINKEDIN_CLIENT_ID=$CLIENT_ID" >> .env
fi

if grep -q "LINKEDIN_CLIENT_SECRET=" .env; then
  sed -i '' "s|LINKEDIN_CLIENT_SECRET=.*|LINKEDIN_CLIENT_SECRET=$CLIENT_SECRET|" .env
else
  echo "LINKEDIN_CLIENT_SECRET=$CLIENT_SECRET" >> .env
fi

echo "LinkedIn credentials updated in .env"

# Make sure frontend mock data is disabled
if [ -f frontend/.env.local ]; then
  echo "Ensuring mock data is disabled in frontend/.env.local..."
  if grep -q "VITE_MOCK_DATA=" frontend/.env.local; then
    sed -i '' "s/VITE_MOCK_DATA=.*/VITE_MOCK_DATA=false/" frontend/.env.local
  else
    echo "VITE_MOCK_DATA=false" >> frontend/.env.local
  fi
fi

# Check database migration status
echo
echo "Checking database migration status..."
docker-compose run --rm backend python src/scripts/alembic_wrapper.py current
echo

# Show that the LinkedIn tables are already created
echo "Verifying LinkedIn tables in the database..."
docker-compose exec db psql -U postgres -d sheetgpt -c "\dt linkedin*" -c "\dt brand_connections"
echo

# List sample records (this should return empty for new installations)
echo "Current LinkedIn data in database:"
docker-compose exec db psql -U postgres -d sheetgpt -c "SELECT COUNT(*) FROM linkedin_accounts"
docker-compose exec db psql -U postgres -d sheetgpt -c "SELECT COUNT(*) FROM linkedin_connections"
docker-compose exec db psql -U postgres -d sheetgpt -c "SELECT COUNT(*) FROM brand_connections"

echo
echo "LinkedIn integration setup is complete!"
echo "To activate the changes, restart the Docker containers:"
echo "  docker-compose down && docker-compose up -d"
echo
echo "To connect your LinkedIn account, visit:"
echo "  http://localhost:5173/settings"
echo "and click the 'Connect LinkedIn' button."
echo