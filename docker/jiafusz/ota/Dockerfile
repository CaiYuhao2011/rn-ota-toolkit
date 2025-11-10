# 贝尔实验室 Spring 官方推荐镜像 JDK下载地址 https://bell-sw.com/pages/downloads/
FROM m.daocloud.io/docker.io/bellsoft/liberica-openjdk-debian:17.0.11-cds

LABEL maintainer="JiaFuSZ"

RUN mkdir -p /home/jiafusz/ota/logs \
    /home/jiafusz/ota/temp \
    /home/jiafusz/skywalking/agent

WORKDIR /home/jiafusz/ota

ENV SERVER_PORT=10080 LANG=C.UTF-8 LC_ALL=C.UTF-8 JAVA_OPTS=""

EXPOSE ${SERVER_PORT}

# 通过 volume 挂载 jar 文件
ADD jar/ota-server.jar /home/jiafusz/ota/app.jar

ENTRYPOINT java -Djava.security.egd=file:/dev/./urandom -Dserver.port=${SERVER_PORT} \
           # 应用名称 如果想区分集群节点监控 改成不同的名称即可
           #-Dskywalking.agent.service_name=ota-server \
           #-javaagent:/jiafusz/skywalking/agent/skywalking-agent.jar \
           -XX:+HeapDumpOnOutOfMemoryError -XX:+UseZGC ${JAVA_OPTS} \
           -jar app.jar