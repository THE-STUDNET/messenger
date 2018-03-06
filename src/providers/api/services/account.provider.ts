
import { Injectable } from '@angular/core';
import { App, Platform } from 'ionic-angular';
// Providers
import { Api } from './api.provider';
import { Events } from '../../events/events.provider';
import { LinkedIn } from '@ionic-native/linkedin';

@Injectable()
export class Account {

    public preSignedSession: any;

    public session: {
        id?:number,
        token?:string,
        wstoken?:string,
        fbtoken?:string,
        cgu_accepted?: boolean
    } = {};

    public errors = {
        PASSWORD_INVALID: -32032,
        ACCOUNT_INVALID: -32033
    };

    constructor(public api: Api, public ionicApp: App, private linkedIn: LinkedIn, private events: Events, private platform: Platform ) {
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
        this.api.setAuthorization();
        localStorage.clear();
    }

    login( credentials: object ){
        return this.api.send( 'user.login', credentials )
            .then( data => this._login(data) );
    }

    linkedinLogin(): Promise<any>{
        return this.linkedIn.login(['r_basicprofile'], true).then( () => {
            return this.linkedIn.getRequest('people/~')
                .then( res =>
                    this.api.send('user.linkedinLogIn',{linkedin_id:res.id})
                        .then( data => this._login(data) ) );
        }, function( err ){
            throw err;
        });
    }

    agreeTermsAndConditions(){
        return this.api.send('user.acceptCgu',{}).then(()=>{
            this.session.cgu_accepted = true;
            localStorage.setItem('session', JSON.stringify(this.session));
            this.events.process('account::login');
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

        if( !this.platform.is('ios') || this.session.cgu_accepted ){
            // SEND LOGIN EVENT
            localStorage.setItem('session', JSON.stringify(data));
            this.session.cgu_accepted = true;
            this.events.process('account::login');
        }
    }

    _logout(){
        this.clear();
        this.events.process('account::logout');
    }
}
