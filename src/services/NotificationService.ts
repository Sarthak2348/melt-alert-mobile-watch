
import { LocalNotifications } from '@capacitor/local-notifications';
import { Howl } from 'howler';

export class NotificationService {
  static alarmSound: Howl | null = null;

  static async initialize() {
    await LocalNotifications.requestPermissions();
    
    this.alarmSound = new Howl({
      src: ['/sounds/alarm.mp3'],
      loop: true,
      volume: 1.0,
    });
  }

  static async sendNotification(title: string, body: string) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(),
            sound: 'beep.wav',
            attachments: null,
            actionTypeId: '',
            extra: null
          }
        ]
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  static playAlarm() {
    if (this.alarmSound && !this.alarmSound.playing()) {
      this.alarmSound.play();
    }
  }

  static stopAlarm() {
    if (this.alarmSound && this.alarmSound.playing()) {
      this.alarmSound.stop();
    }
  }
}
