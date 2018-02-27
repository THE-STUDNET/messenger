import { Injectable, Inject } from '@angular/core';
import { Account } from '../api/api.module';

@Injectable()
export class Hangout {

    constructor( @Inject('Configuration') public config, public account: Account ) {}

    launch( hangout_id: number ){

        let params = {
            api: {
                auth_token: this.account.session.token,
                authorization_header: this.config.api.authorization_header,
                domain: this.config.api.domain,
                protocol: this.config.api.protocol,
                paths: {
                    jsonrpc: this.config.api.path
                }
            },
            dms: {
                domain: this.config.dms.domain,
                paths: this.config.dms.paths,
                protocol: this.config.dms.protocol
            },
            firebase: this.config.firebase, // { url: this.config.firebase.databaseURL, auth_token: this.account.session.fbtoken },
            ws: {
                auth_token: this.account.session.wstoken,
                domain: this.config.rt.domain,
                port: this.config.rt.port,
                secure: this.config.rt.secure
            },
            tokbox_api_key: this.config.tokbox_api_key,
            user_id: this.account.session.id,
            hangout_id: hangout_id
        };

        params.firebase.token = this.account.session.fbtoken;

        let paramsString = JSON.stringify(params);

        console.log('H', params);

        try{
            window['twiccordovaplugin'].launchHangout(
                params,
                function(){ console.log('hgt success', paramsString, arguments); },
                function(){ console.log('hgt error', arguments); }
            );
        }catch(e){
            console.log('Error', e);
        }
    }
}
