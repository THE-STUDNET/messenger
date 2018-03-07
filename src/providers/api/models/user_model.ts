import { Injectable } from '@angular/core';
import { Api } from '../services/api.provider';
import { AbstractModel } from './abstract_model';

@Injectable()
export class UserModel extends AbstractModel {

    public _method_get: string = 'user.get';
    public cache_model_prefix: string = 'usr.';
    public cache_list_name: string = 'u.ids';

    constructor(  public api: Api ){
        super( api );
    }
}
