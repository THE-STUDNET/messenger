import { Injectable, Inject } from '@angular/core';
import { Platform } from 'ionic-angular';
import { Api } from './api.provider';
import { FCM } from '@ionic-native/fcm';
import { Device } from '@ionic-native/device';
import { Events } from '../../events/events.provider';

@Injectable()
export class NotificationService {

    public token: string;

    constructor( @Inject('Configuration') private config, private fcm: FCM, private api: Api, private platform: Platform, private device: Device, private events: Events ) {
        if( platform.is('cordova') ){
            try{
                // Register FCM token when refreshed...
                fcm.onTokenRefresh().subscribe( token => {
                    console.log('token refreshed', token);
                    api.queue('user.registerFcm',{token:token, uuid: this.device.uuid, package: config.package }).then(()=> this.token = token );
                });
                // Process events when notifications received.
                fcm.onNotification().subscribe( data => {
                    console.log('NTF', data );
                    if( data.data ){
                        try{
                            let ntf = JSON.parse( data.data );
                            if( ntf.type ){
                                events.process('notification::'+ntf.type, data.wasTapped, ntf.data );
                            }
                        }catch( e ){

                        }
                    }
                });
            }catch( error ){
                console.log('Cordova:', error );
            }
        }
    }

    public register(){
        if( this.platform.is('cordova') ){
            try{
                console.log('Register');
                this.fcm.getToken().then(token => {
                    console.log('TOKEN', token);
                    this.api.queue('user.registerFcm',{token:token, uuid: this.device.uuid, package: this.config.package }).then(()=> this.token = token );
                });
            }catch( error ){
                console.log('Cordova:', error );
            }
        }
    }

    public unregister(){
        if( this.token ){
            this.api.queue('fcm.unregister',{ token: this.token, uuid: this.device.uuid, package: this.config.package });
        }
    }
}
