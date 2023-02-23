import mqtt from 'mqtt';
import process from 'process';
import microstats from 'microstats';
import dotenv from 'dotenv';

dotenv.config();

interface CPUUsage {
  loadpct: number;
  userpct: number;
  syspct: number;
  idlepct: number;
}
interface MEMUsage {
  usedpct: number;
  total: number;
  free: number;
}
interface DISKUsage {
  filesystem: string;
  mount: string;
  usedpct: number;
  total: number;
  free: number;
}
interface MetricData {
  cpu: CPUUsage;
  mem: MEMUsage;
  disk: DISKUsage;
  date: string;
  time: number;
}

class APMService {
  intervalMS = 1000;
  client?: mqtt.MqttClient;
  isStarted = false;
  memory: MEMUsage;
  cpu: CPUUsage;
  disk: DISKUsage;

  init() {
    // INTERVAL_MS
    if (process.env.INTERVAL_MS) {
      this.intervalMS = parseInt(process.env.INTERVAL_MS, 10);
    }

    // ENV CHECK
    if (
      !(
        process.env.APM_MQTT_HOST &&
        process.env.APM_MQTT_ID &&
        process.env.APM_MQTT_PASSWORD &&
        process.env.APM_MQTT_TOPIC &&
        process.env.APM_MQTT_CLIENT_ID
      )
    ) {
      console.info(
        'APM service did not start. Environment variables are empty.',
      );
      console.info(
        '=====================================================\n',
        'APM_MQTT_HOST : ' + process.env.APM_MQTT_HOST + '\n',
        'APM_MQTT_ID : ' + process.env.APM_MQTT_ID + '\n',
        'APM_MQTT_PASSWORD : ' + process.env.APM_MQTT_PASSWORD + '\n',
        'APM_MQTT_TOPIC : ' + process.env.APM_MQTT_TOPIC + '\n',
        'APM_MQTT_CLIENT_ID : ' + process.env.APM_MQTT_CLIENT_ID,
      );
      return;
    }

    console.info(
      'APM service start.\n',
      '=====================================================\n',
      'INTERVAL_MS (default: 1000) : ' + this.intervalMS + '\n',
      'APM_MQTT_HOST : ' + process.env.APM_MQTT_HOST + '\n',
      'APM_MQTT_ID : ' + process.env.APM_MQTT_ID + '\n',
      'APM_MQTT_PASSWORD : ' + process.env.APM_MQTT_PASSWORD + '\n',
      'APM_MQTT_TOPIC : ' + process.env.APM_MQTT_TOPIC + '\n',
      'APM_MQTT_CLIENT_ID : ' + process.env.APM_MQTT_CLIENT_ID,
    );
    const options: any = {
      clientId: process.env.APM_MQTT_CLIENT_ID,
      rejectUnauthorized: false,
      username: process.env.APM_MQTT_ID,
      password: process.env.APM_MQTT_PASSWORD,
      keepAlive: 60,
      reconnectPeriod: 10 * 1000,
      connectTimeout: 30 * 1000,
      clean: true,
    };
    this.client = mqtt.connect(process.env.APM_MQTT_HOST, options);
    this.client.on('connect', () => {
      console.info('APM Server connected');
      if (this.isStarted) {
        return;
      }
      this.isStarted = true;
      this.start();
    });

    this.client.on('close', () => {
      console.info('APM Service close');
    });

    this.client.on('disconnect', () => {
      console.info('APM Service disconnect');
    });

    this.client.on('offline', () => {
      console.info('APM Service offline');
    });

    this.client.on('error', (err) => {
      console.error(err);
    });
  }

  start() {
    microstats.on('memory', (memory) => {
      this.memory = memory;
    });
    microstats.on('cpu', (cpu) => {
      this.cpu = cpu;
    });
    microstats.on('disk', (disk) => {
      this.disk = disk;
    });
    let options = { frequency: '1s' };
    microstats.start(options, function (err) {
      if (err) console.log(err);
    });

    setInterval(() => {
      const metric: MetricData = this.collectMetric();
      console.debug(metric);
      this.send(metric);
    }, this.intervalMS);
  }

  collectMetric(): MetricData {
    const now: Date = new Date();
    const metric: MetricData = {
      cpu: this.cpu,
      mem: this.memory,
      disk: this.disk,
      date: now.toISOString(),
      time: now.getTime(),
    };

    return metric;
  }

  send(metric: MetricData) {
    if (
      metric.cpu === undefined ||
      metric.mem === undefined ||
      metric.disk === undefined
    ) {
      console.info('send skip');
      return;
    }
    this.client?.publish(
      process.env.APM_MQTT_TOPIC,
      Buffer.from(JSON.stringify(metric), 'utf-8'),
    );
  }
}

process.on('SIGINT', () => {
  process.exit();
});

const service: APMService = new APMService();
service.init();
