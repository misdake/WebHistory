start "" /B "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --user-data-dir="userdata" --remote-debugging-port=9222
ping localhost -n 2 >NUL
node index.js --delay=1000
ping localhost -n 2 >NUL
C:\Software\NirCmd\nircmd.exe win close ititle "Google Chrome"
