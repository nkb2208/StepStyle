Xem Swagger UI

cd services/admin-services/user-service

# Cài dependencies
pip install -e ".[dev]"

pip install "pyjwt[crypto]>=2.8" "httpx>=0.27"

# Chạy server (port 4005)
python -m user.main

# truy cập 
http://localhost:4005/docs 