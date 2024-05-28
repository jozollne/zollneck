npm run build
sudo rm -rf /var/www/zollneck.de/front/dist/
sudo cp -r /zollneck/frontzollneck/dist /var/www/zollneck.de/front/
sudo cp /zollneck/frontzollneck/.htaccess /var/www/zollneck.de/front/dist/
sudo chown -R www-data:www-data /var/www/zollneck.de/front/
sudo service apache2 reload
