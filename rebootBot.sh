ps cax | grep node > /dev/null
if [ $? -eq 0 ]; then
  echo "Process is running." >/dev/null 2>&1
else
  echo "Process is not running."
  PATH=$PATH:/usr/local/bin
  pm2 start bot.js
fi