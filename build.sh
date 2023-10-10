# 服务名，也是 docker 镜像 / 容器名字
SERVER_NAME='blog'
# 构建的路径：环境变量基础路径 + 服务名
SOURCE_PATH='/opt/blog'
# 容器 id
CID=$(docker ps | grep "$SERVER_NAME" | awk '{print $1}')
# 镜像 id
IID=$(docker images | grep "$SERVER_NAME" | awk '{print $3}')
# 构建 docker 镜像
docker build -t $SERVER_NAME .
cd $SOURCE_PATH
# 先构建，再更新。
# 如果有该容器
if [ -n "$CID" ]; then
  echo "存在容器 $SERVER_NAME, CID-$CID"
  docker stop $SERVER_NAME
  docker rm $SERVER_NAME
fi
# 运行 docker 容器
docker run --name $SERVER_NAME -d -p 3000:80 $SERVER_NAME
echo "$SERVER_NAME 运行成功"
