
poetry run dev

poetry run start

pip install rapidocr-openvino

poetry export -f requirements.txt --output requirements.txt --without-hashes

export http_proxy=http://host.docker.internal:1081;export https_proxy=http://host.docker.internal:1081

# ---------------cpu------------------
# 使用代理构建
docker build \
  --network host \
  --build-arg HTTP_PROXY="http://host.docker.internal:1081" \
  --build-arg HTTPS_PROXY="http://host.docker.internal:1081" \
  -t alterzz/timebox-ocr-service .


docker tag alterzz/timebox-ocr-service alterzz/timebox-ocr-service:1.1.0
docker tag alterzz/timebox-ocr-service alterzz/timebox-ocr-service:latest

docker push alterzz/timebox-ocr-service:1.1.0
docker push alterzz/timebox-ocr-service:latest




# ---------------cuda------------------

docker build \
  --network host \
  --build-arg HTTP_PROXY="http://host.docker.internal:1081" \
  --build-arg HTTPS_PROXY="http://host.docker.internal:1081" \
  -f Dockerfile.cuda \
  -t alterzz/timebox-ocr-service-cuda .
  
  docker tag alterzz/timebox-ocr-service-cuda alterzz/timebox-ocr-service-cuda:1.1.0
  docker tag alterzz/timebox-ocr-service-cuda alterzz/timebox-ocr-service-cuda:latest

  docker push alterzz/timebox-ocr-service-cuda:1.1.0
  docker push alterzz/timebox-ocr-service-cuda:latest 


