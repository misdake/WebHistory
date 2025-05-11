start "" /B "C:\Program Files\Google\Chrome\Application\chrome.exe" --no-sandbox --no-first-run --user-data-dir="D:\WebHistory\userdata" --remote-debugging-port=9222 chrome://newtab
ping localhost -n 2 >NUL
node index.js --delay=1000
ping localhost -n 2 >NUL
