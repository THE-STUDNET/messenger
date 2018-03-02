import { Component, Inject, ViewChild } from '@angular/core';
import { Platform, NavController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { Api, Account, NotificationService, ConversationModel } from '../providers/api/api.module';
import { Events } from '../providers/events/events.provider';
import { Hangout } from '../providers/hangout/hangout.provider';
import { WebSocket } from '../providers/shared/shared.module';

// import pages
import { WelcomePage } from '../pages/welcome/welcome';
import { HomePage } from '../pages/home/home';
import { ConversationPage } from '../pages/conversation/conversation';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
    @ViewChild('navCtrl') navCtrl: NavController
    rootPage:any;

    constructor(platform: Platform, public statusBar: StatusBar, splashScreen: SplashScreen, private account: Account,
        api: Api, private notifications: NotificationService, events: Events, hangout: Hangout,
        private websocket: WebSocket, @Inject('Configuration') private config, cvnModel: ConversationModel ) {
        // When platform is ready, configure plugins & set root page.
        platform.ready().then(() => {
            try{
                if( platform.is('cordova') ){
                    statusBar.backgroundColorByHexString('#999999');
                    splashScreen.hide();
                }
            }catch( e ){
                console.log('Error', e);
            }

            if( account.session.id ){
                api.setAuthorization( account.session.token );
                this.onLogin();
            }else{
                this.rootPage = WelcomePage;
            }
        });

        // When user log in => Redirect him on LiveClasses page.
        events.on('account::login',() => {
            this.onLogin();
        });
        // When user log out => Redirect him on Login page.
        events.on('account::logout', () => {
            statusBar.backgroundColorByHexString('#E7E7E7');
            // Navigate to login page.
            this.rootPage = WelcomePage;
            // Unregister device.
            notifications.unregister();
            // Disconnect from websocket server
            websocket.disconnect();
        });
        // When user receive item.starting notification.
        events.on('notification::item.starting', event => {
            if( account.session.id ){
                let tapped = event.data[0],
                    data = event.data[1];

                if( data.type === 'LC' && tapped && data.conversation_id ){
                    hangout.launch( data.conversation_id );
                }
            }
        });

        events.on('notification::message', event=>{
            let wasTapped = event.data[0], id = event.data[1].conversation;
            if( wasTapped ){
                cvnModel.get([id]).then(
                    ()=>this.navCtrl.push(ConversationPage,{ conversation: cvnModel.list[id].datum }) ).catch();
            }
        });        
    }

    onLogin(){
        this.statusBar.backgroundColorByHexString('#0B9290');
        // Navigate to live classes page.
        this.rootPage = HomePage;
        // Register device to receive future notifications.
        this.notifications.register();
        // Connect to websocket server...
        this.websocket.connect( 
            (this.config.rt.port==='443'?'https':'http')+'://'+this.config.rt.domain+':'+this.config.rt.port,
            this.account.session.id, 
            this.account.session.wstoken
        );
    }
}
