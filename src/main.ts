import mqtt from 'mqtt';
import process from 'process';
import microstats from 'microstats';
import dotenv from 'dotenv';
import moment from 'moment';
import 'moment-timezone';
import { logger } from '@/logger';
import { LOG_DIR } from '@config';

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
    logger.info('!!!');
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
      logger.info('APM service did not start. Environment variables are empty.');
      logger.info(
        '=====================================================\n',
        'APM_MQTT_HOST : ' +
          process.env.APM_MQTT_HOST +
          '\n' +
          'APM_MQTT_ID : ' +
          process.env.APM_MQTT_ID +
          '\n' +
          'APM_MQTT_PASSWORD : ' +
          process.env.APM_MQTT_PASSWORD +
          '\n' +
          'APM_MQTT_TOPIC : ' +
          process.env.APM_MQTT_TOPIC +
          '\n' +
          'APM_MQTT_CLIENT_ID : ' +
          process.env.APM_MQTT_CLIENT_ID,
      );
      return;
    }
    logger.info(
      'APM service start.\n' +
        '=====================================================\n' +
        'INTERVAL_MS (default: 1000) : ' +
        this.intervalMS +
        '\n' +
        'TIMEZONE : ' +
        process.env.TIMEZONE +
        '\n' +
        'DATE_FORMAT : ' +
        process.env.DATE_FORMAT +
        '\n' +
        'APM_MQTT_HOST : ' +
        process.env.APM_MQTT_HOST +
        '\n' +
        'APM_MQTT_ID : ' +
        process.env.APM_MQTT_ID +
        '\n' +
        'APM_MQTT_PASSWORD : ' +
        process.env.APM_MQTT_PASSWORD +
        '\n' +
        'APM_MQTT_TOPIC : ' +
        process.env.APM_MQTT_TOPIC +
        '\n' +
        'APM_MQTT_CLIENT_ID : ' +
        process.env.APM_MQTT_CLIENT_ID,
    );
    logger.info('LOG_DIR', process.env.LOG_DIR);
    logger.info('LOG_FORMAT', process.env.LOG_FORMAT);
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
      logger.info('APM Server connected');
      if (this.isStarted) {
        return;
      }
      this.isStarted = true;
      this.start();
    });

    this.client.on('close', () => {
      logger.info('APM Service close');
    });

    this.client.on('disconnect', () => {
      logger.info('APM Service disconnect');
    });

    this.client.on('offline', () => {
      logger.info('APM Service offline');
    });

    this.client.on('error', err => {
      logger.error(err);
    });
  }

  start() {
    microstats.on('memory', memory => {
      this.memory = memory;
    });
    microstats.on('cpu', cpu => {
      this.cpu = cpu;
    });
    microstats.on('disk', disk => {
      this.disk = disk;
    });
    let options: any = { frequency: '1s' };

    if (process.env.FILE_SYSTEM) {
      const fsArr: Array<string> = process.env.FILE_SYSTEM.split(',');
      options.diskalert = {
        filesystems: fsArr,
      };
    }

    microstats.start(options, function (err) {
      if (err) logger.log(err);
    });

    setInterval(() => {
      const metric: MetricData = this.collectMetric();
      logger.info(JSON.stringify(metric));
      this.send(metric);
    }, this.intervalMS);
  }

  collectMetric(): MetricData {
    const now: Date = new Date();
    let nowDate = now.toISOString();
    if (process.env.TIMEZONE && process.env.DATE_FORMAT) {
      nowDate = moment.tz(process.env.TIMEZONE).format(process.env.DATE_FORMAT);
    }
    const metric: MetricData = {
      cpu: this.cpu,
      mem: this.memory,
      disk: this.disk,
      date: nowDate,
      time: now.getTime(),
    };

    return metric;
  }

  send(metric: MetricData) {
    if (metric.cpu === undefined || metric.mem === undefined || metric.disk === undefined) {
      logger.info('send skip');
      return;
    }
    this.client?.publish(process.env.APM_MQTT_TOPIC, Buffer.from(JSON.stringify(metric), 'utf-8'));
  }
}

process.on('uncaughtException', function (err) {
  logger.error(err);
});

process.on('SIGINT', () => {
  process.exit();
});

const service: APMService = new APMService();
service.init();
