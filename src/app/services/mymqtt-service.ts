import { inject, Injectable, signal } from '@angular/core';
import { IMqttMessage, MqttService } from 'ngx-mqtt';
import { Observable } from 'rxjs';
import { VeiclePosition } from '../models/veicle-position';

@Injectable({
  providedIn: 'root',
})
export class MyMqttService {
  mqttService = inject(MqttService);
  positionVeiclesList =signal<VeiclePosition[]>([]);

  topicSubscribe(topic: string): Observable<IMqttMessage> {
    return this.mqttService.observe(topic);
  }

  topicPublish(topic: string, message: string) {
    return this.mqttService.unsafePublish(topic, message);
  }

  unsubscribe(topic: string) {
    this.unsubscribe(topic);
    console.log('non sei piu iscritto');
  }

}
