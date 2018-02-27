
import { Injectable } from '@angular/core';
import { Api } from './api.provider';
import { App } from 'ionic-angular';

@Injectable()
export class LiveClassesService {

    public conversations: Array<any> = [];

    constructor(public api: Api, public ionicApp: App ) {}

    getList(){
        return this.api.send('conversation.getList', {type:3}).then( data => {
            if( data && Array.isArray(data) ){
                this.conversations = data;
            }
        }).catch(()=>{
            this.conversations = [];
        });
    }
}
