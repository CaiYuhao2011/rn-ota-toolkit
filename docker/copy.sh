#!/bin/sh

# 复制项目的文件到对应docker路径，便于一键生成镜像。
usage() {
	echo "Usage: sh copy.sh"
	exit 1
}

# copy jar
echo "begin copy jiafusz-admin"
cp ../../jiafusz-admin/target/jiafusz-admin.jar ./jiafusz/admin/jar

echo "begin copy jiafusz-monitor-admin"
cp ../../jiafusz-extend/jiafusz-monitor-admin/target/jiafusz-monitor-admin.jar ./jiafusz/monitor/jar

echo "begin copy jiafusz-mqtt-client"
cp ../../jiafusz-extend/jiafusz-mqtt-client/target/jiafusz-mqtt-client.jar ./jiafusz/mqtt/jar

echo "begin copy jiafusz-rfid-server"
cp ../../jiafusz-extend/jiafusz-rfid-server/target/jiafusz-rfid-server.jar ./jiafusz/rfid/jar

echo "begin copy jiafusz-socket-server"
cp ../../jiafusz-extend/jiafusz-socket-server/target/jiafusz-socket-server.jar ./jiafusz/socket/jar

echo "begin copy jiafusz-pouring"
cp ../../jiafusz-extend/jiafusz-pouring/target/jiafusz-pouring.jar ./jiafusz/pouring/jar
