# sclab-apm
Simple APM Agent using MQTT

# Installation
## 1. install git
~~~bash
# centos
yum install git
~~~

## 2. install nodejs
~~~bash
curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo yum install nodejs
~~~

## 3. clone source
~~~bash
git clone https://github.com/sclab-io/sclab-apm.git
~~~

## 4. create .env
~~~bash
vi .env
~~~

## 5. setup .env
~~~bash
INTERVAL_MS=1000
TIMEZONE=Asia/Seoul
DATE_FORMAT=yyyy-MM-dd HH:mm:ss
APM_MQTT_TOPIC=topic
APM_MQTT_HOST=host
APM_MQTT_CLIENT_ID=clientid
APM_MQTT_ID=id
APM_MQTT_PASSWORD=password
# FILE_SYSTEM=/dev/disk2s2,/dev/disk1s3
~~~

## 6. build
~~~bash
./build.sh
~~~

## 7. [ start|stop|logs ].sh Scripts
### start
~~~bash
./run.sh
~~~

### stop
~~~bash
./stop.sh
~~~

### logs
~~~bash
./logs.sh
~~~

### more commands
~~~bash
npx pm2 -h
~~~

# File System Change
~~~bash
./stop.sh
~~~

modify .env
~~~bash
# display file system list
df

vi .env

# uncomment FILE_SYSTEM
FILE_SYSTEM=/dev/disk2s2,/dev/disk1s3
~~~

start
~~~bash
./run.sh
~~~
