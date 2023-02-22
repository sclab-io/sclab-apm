# sclab-apm
Simple APM Agent using MQTT

# create .env
~~~bash
$ vi .env
~~~

# setup .env
~~~bash
INTERVAL_MS=1000
APM_MQTT_TOPIC=topic
APM_MQTT_HOST=host
APM_MQTT_CLIENT_ID=clientid
APM_MQTT_ID=id
APM_MQTT_PASSWORD=password
~~~

# start
~~~bash
$ ./run.sh
~~~

# stop
~~~bash
$ ./stop.sh
~~~

# logs
~~~bash
$ ./logs.sh
~~~