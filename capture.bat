start "" /B "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --user-data-dir="userdata" --remote-debugging-port=9222
ping localhost -n 3 >NUL
mkdir capture
node index.js --outputDir="capture/" --output="chiphell.png" --url="https://chiphell.com" --delay=1000
node index.js --outputDir="capture/" --output="reddit.png" --url="https://reddit.com/r/gaming" --delay=1000
node index.js --outputDir="capture/" --output="trello.png" --url="https://trello.com/b/BBfpsZj2/home" --delay=1000
ping localhost -n 2 >NUL
C:\Software\NirCmd\nircmd.exe win close ititle "Google Chrome"