type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

class Logger {
  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };

    // In a real production app, this would send data to Sentry, Datadog, or CloudWatch
    if (process.env.NODE_ENV === 'development') {
      const style = level === 'error' ? 'color: red' : level === 'warn' ? 'color: orange' : 'color: blue';
      console.log(`%c[${level.toUpperCase()}] ${message}`, style, data || '');
    } else {
      // Production logging logic here
      console.log(JSON.stringify(entry));
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, error?: any) {
    this.log('error', message, error);
  }
}

export const logger = new Logger();