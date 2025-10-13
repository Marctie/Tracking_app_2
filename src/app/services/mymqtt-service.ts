import { inject, Injectable, signal } from '@angular/core';
import { IMqttMessage, MqttService } from 'ngx-mqtt';
import { Observable, Subscription } from 'rxjs';
import { VeiclePosition } from '../models/veicle-position';
import { VeicleStatus } from '../models/veicles';

 
@Injectable({
  providedIn: 'root',
})
export class MyMqttService {
  mqttService = inject(MqttService);
  positionVeiclesList = signal<VeiclePosition[]>([]);
  statusById = signal<Record<number, VeicleStatus>>({});
 
  private subs = new Map<string, Subscription>();
 
  topicSubscribe(topic: string): Observable<IMqttMessage> {
    return this.mqttService.observe(topic);
  }
 
  topicPublish(topic: string, message: string) {
    return this.mqttService.unsafePublish(topic, message);
  }
 
ingestStatusMessage(msg: IMqttMessage) {
    try {
      const data = JSON.parse(msg.payload.toString()) as VeicleStatus;
      if (!data?.vehicleId || !data?.status) return;
 
      const curr = this.statusById();
      const prev = curr[data.vehicleId];
      const tPrev = prev ? +new Date(prev.timestamp) : 0;
      const tNew  = +new Date(data.timestamp ?? Date.now());
 
      if (tNew >= tPrev) {
        this.statusById.set({ ...curr, [data.vehicleId]: data });
      }
    } catch (e) {
      console.error('Bad status MQTT message', e);
    }
  }
 
  subscribeAndTrack(topic: string, handler: (m: IMqttMessage) => void) {
    const s = this.mqttService.observe(topic).subscribe(handler);
    this.subs.set(topic, s);
    return s;
  }
 
  unsubscribe(topic: string) {
    this.subs.get(topic)?.unsubscribe();
    this.subs.delete(topic);
    console.log(`Unsubscribed ${topic}`);
  }
 
}
