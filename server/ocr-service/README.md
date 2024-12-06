
poetry run dev

poetry run start

pip install rapidocr-openvino

poetry export -f requirements.txt --output requirements.txt --without-hashes


# 使用代理构建
docker build \
  --network host \
  --build-arg HTTP_PROXY="http://127.0.0.1:1088" \
  --build-arg HTTPS_PROXY="http://127.0.0.1:1088" \
  -t alterzz/timebox-ocr-service .


docker tag alterzz/timebox-ocr-service alterzz/timebox-ocr-service:1.0.0
docker tag alterzz/timebox-ocr-service alterzz/timebox-ocr-service:latest

docker push alterzz/timebox-ocr-service:1.0.0
docker push alterzz/timebox-ocr-service:latest


