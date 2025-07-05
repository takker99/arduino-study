import sqlite3 from 'sqlite3';
import type { SensorData } from './types';

/**
 * センサーデータのデータベース管理
 */
export class DatabaseManager {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(':memory:');
    this.initializeDatabase();
  }

  /**
   * データベースの初期化
   */
  private initializeDatabase(): void {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE sensor_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          pot INTEGER,
          temp REAL,
          light INTEGER
        )
      `);
    });
  }

  /**
   * センサーデータを保存
   */
  saveSensorData(data: SensorData): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT INTO sensor_data (pot, temp, light) VALUES (?, ?, ?)",
        [data.pot, data.temp, data.light],
        function(err) {
          if (err) {
            console.error('Database insert error:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * 最新のセンサーデータを取得
   */
  getLatestSensorData(limit: number = 10): Promise<(SensorData & { id: number; timestamp: string })[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT ?",
        [limit],
        (err, rows) => {
          if (err) {
            console.error('Database select error:', err);
            reject(err);
          } else {
            resolve(rows as (SensorData & { id: number; timestamp: string })[]);
          }
        }
      );
    });
  }

  /**
   * データベースを閉じる
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Database close error:', err);
        } else {
          console.log('Database closed successfully');
        }
        resolve();
      });
    });
  }

  /**
   * データベースインスタンスを取得（レガシー対応）
   */
  getDatabase(): sqlite3.Database {
    return this.db;
  }
}

export const databaseManager = new DatabaseManager();
