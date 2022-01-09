start "" /B "C:\Program Files\Google\Chrome\Application\chrome2.exe" --user-data-dir="D:\WebHistory\userdata" --remote-debugging-port=9222
ping localhost -n 2 >NUL
node index.js --delay=1000
ping localhost -n 2 >NUL
