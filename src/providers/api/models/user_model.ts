import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Api } from '../services/api.provider';
import { AbstractModel } from './abstract_model';
import { Garbage } from '../services/garbage.provider';

@Injectable()
export class UserModel extends AbstractModel {

    public _method_get: string = 'user.get';
    public cache_model_prefix: string = 'usr.';
    public cache_list_name: string = 'u.ids';

    constructor(  public api: Api, public storage:Storage, public garbage:Garbage ){
        super( api, storage, garbage );
    }
}
