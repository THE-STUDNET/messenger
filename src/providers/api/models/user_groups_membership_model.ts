import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Api } from '../services/api.provider';
import { AbstractModel } from './abstract_model';
import { Garbage } from '../services/garbage.provider';

@Injectable()
export class UGMModel extends AbstractModel {

    public _method_get: string = 'pageuser.getListByUser';
    public cache_model_prefix: string = 'ugm.';
    public cache_list_name: string = 'ugm.ids';

    constructor(  public api: Api, public storage:Storage, public garbage:Garbage ){
        super( api, storage, garbage );
    }

    _buildGetParams( ids ): any{
        return { user_id: ids, type: 'group', state: 'member'};
    }
}