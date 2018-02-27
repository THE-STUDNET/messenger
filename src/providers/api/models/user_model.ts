import { Injectable } from '@angular/core';
import { Api } from '../services/api.provider';
import { AbstractModel } from './abstract_model';

@Injectable()
export class UserModel extends AbstractModel {

    constructor(  public api: Api ){
        super( {
            cache_model_prefix: 'usr.',
            cache_list_name: 'u.ids',
            _method_get: 'user.get',
        }, api );
    }

}
