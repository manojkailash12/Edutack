@echo off
echo Building and deploying Edutack to Netlify...

echo.
echo Step 1: Installing Frontend dependencies...
cd Frontend
call npm install

echo.
echo Step 2: Building Frontend...
call npm run build

echo.
echo Step 3: Going back to root directory...
cd ..

echo.
echo Step 4: Deploying to Netlify...
echo Make sure you have netlify-cli installed: npm install -g netlify-cli
echo Run: netlify login (if not already logged in)
echo Run: netlify init (if first time)
echo Run: netlify deploy --prod

echo.
echo Deployment preparation complete!
echo Now run: netlify deploy --prod
pause