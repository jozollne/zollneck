npm run build
pm2 stop /zollneck/backzollneck/ecosystem.config.js
sudo rm -rf /var/www/zollneck.de/back/dist
sudo cp -r ./dist /var/www/zollneck.de/back/
sudo cp -r ./node_modules /var/www/zollneck.de/back/
sudo cp ./package.json /var/www/zollneck.de/back/
sudo cp ./ecosystem.config.js /var/www/zollneck.de/back/
sudo chown -R jozollne:jozollne /var/www/zollneck.de/back/
pm2 start /var/www/zollneck.de/back/ecosystem.config.js
pm2 log
