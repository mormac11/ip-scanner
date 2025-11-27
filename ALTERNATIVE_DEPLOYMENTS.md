# Alternative Deployment Options

If you can't use the full SSL setup (no domain, testing, etc.), here are alternatives:

## Option 1: Simple Port Forwarding (No SSL)

Expose the frontend on port 443 (HTTP only, not recommended for production):

Edit `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "443:80"  # Map port 443 to nginx port 80
```

Then:
```bash
docker compose up -d
```

Access at: `http://your-server-ip:443`

**⚠️ Warning**: This is HTTP only, not encrypted. Only use for internal networks.

## Option 2: Cloudflare Tunnel (Free SSL, No Port Opening)

Use Cloudflare Tunnel to expose your app with free SSL without opening ports:

### Setup:
1. Create a Cloudflare account and add your domain
2. Install cloudflared:
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

3. Login and create tunnel:
```bash
cloudflared tunnel login
cloudflared tunnel create ip-scanner
```

4. Configure tunnel (`~/.cloudflared/config.yml`):
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/user/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: ipscanner.yourdomain.com
    service: http://localhost:3000
  - hostname: auth.yourdomain.com
    service: http://localhost:8081
  - service: http_status:404
```

5. Route DNS:
```bash
cloudflared tunnel route dns ip-scanner ipscanner.yourdomain.com
cloudflared tunnel route dns ip-scanner auth.yourdomain.com
```

6. Run tunnel:
```bash
cloudflared tunnel run ip-scanner
```

**Benefits**:
- Free SSL from Cloudflare
- No need to open ports 80/443
- DDoS protection
- Works behind NAT/firewall

## Option 3: Use Existing Reverse Proxy

If you already have NGINX or Apache running:

### NGINX Configuration:

Create `/etc/nginx/sites-available/ipscanner`:
```nginx
server {
    listen 80;
    server_name ipscanner.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ipscanner.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/ipscanner.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ipscanner.yourdomain.com/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/ipscanner /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Obtain SSL certificate:
```bash
sudo certbot --nginx -d ipscanner.yourdomain.com
```

## Option 4: Self-Signed Certificate (Development Only)

Generate self-signed certificate:
```bash
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/privkey.pem \
  -out ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

Create `docker-compose.selfsigned.yml`:
```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
      - ./nginx-selfsigned.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - app_network
    depends_on:
      - frontend
      - api

  # ... rest of services from docker-compose.yml
```

Create `nginx-selfsigned.conf`:
```nginx
server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
    }

    location /api/ {
        proxy_pass http://api:8080/api/;
        proxy_set_header Host $host;
    }
}
```

Deploy:
```bash
docker compose -f docker-compose.selfsigned.yml up -d
```

**Note**: Browsers will show security warnings. You'll need to manually accept the certificate.

## Option 5: Cloud Load Balancer

If running on AWS, Azure, or GCP, use their managed load balancers with SSL:

### AWS Application Load Balancer:
1. Create ALB with HTTPS listener
2. Upload SSL certificate to AWS Certificate Manager
3. Point target group to EC2 instance on port 80
4. Update security group to allow ALB traffic

### Azure Application Gateway:
1. Create Application Gateway
2. Upload SSL certificate
3. Configure backend pool with VM
4. Set HTTP settings to port 80

### GCP Load Balancer:
1. Create HTTPS load balancer
2. Upload SSL certificate
3. Configure backend service to instance group
4. Map to port 80

## Recommendations

**For Production**: Use Option 1 (Full SSL Setup with Let's Encrypt) or Option 2 (Cloudflare Tunnel)

**For Development**: Use Option 4 (Self-Signed Certificate)

**For Enterprise**: Use Option 3 (Existing Reverse Proxy) or Option 5 (Cloud Load Balancer)
