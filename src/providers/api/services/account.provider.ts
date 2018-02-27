
import { Injectable } from '@angular/core';
import { App } from 'ionic-angular';
// Providers
import { Api } from './api.provider';
import { Events } from '../../events/events.provider';
import { LinkedIn } from '@ionic-native/linkedin';

@Injectable()
export class Account {

    public session: {
        id?:number,
        token?:string,
        wstoken?:string,
        fbtoken?:string
    } = {};

    public errors = {
        PASSWORD_INVALID: -32032,
        ACCOUNT_INVALID: -32033
    };

    constructor(public api: Api, public ionicApp: App, private linkedIn: LinkedIn, private events: Events ) {
        let sess = localStorage.getItem('session');
        if( sess ){
            Object.assign( this.session, JSON.parse(sess) );
        }

        // On api error, check if user is still connected. => If not trigger logout.
        this.events.on('api::error', ( event )=>{
            let error = event.data[0];
            if( error.code === -32027 ){
                this._logout();
            }
        });
    }

    clear(){
        this.session = {};
        localStorage.removeItem('session');
    }

    login( credentials: object ){
        return this.api.send( 'user.login', credentials )
            .then( data => { this._login(data); } );
    }

    linkedinLogin(){
        this.linkedIn.login(['r_basicprofile'], true).then( () => {
            this.linkedIn.getRequest('people/~')
                .then( res =>
                    this.api.send('user.linkedinLogIn', { linkedin_id:res.id})
                        .then( data => this._login(data) ) );
        }, function(){
            console.log('LinkedinLOGIN ERR', arguments);
        });
    }

    checkExistingMail( mail: string ){
        return this.api.send('user.checkEmail',{ email: mail});
    }

    resendAccountLink( mail: string ){
        return this.api.send('user.lostPassword', {email: mail});
    }

    _login( data ){
        // SET API AUTHORIZATION.
        this.api.setAuthorization( data.token );
        // SET SESSION
        this.session = data;
        localStorage.setItem('session', JSON.stringify(data));
        // SEND LOGIN EVENT
        this.events.process('account::login');
    }

    _logout(){
        this.clear();
        this.api.setAuthorization();
        this.events.process('account::logout');
    }
}
