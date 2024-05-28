npm run build
sudo rm -rf /var/www/zollneck.de/front/dist/
sudo cp -r /opt/zollneck/frontzollneck/dist /var/www/zollneck.de/front/
sudo cp -r /opt/zollneck/frontzollneck/files /var/www/zollneck.de/front/dist/
sudo cp /opt/zollneck/frontzollneck/.htaccess /var/www/zollneck.de/front/dist/
sudo chown -R www-data:www-data /var/www/zollneck.de/front/
sudo service apache2 reload
