import { Injectable } from '@angular/core';
import { Api } from '../services/api.provider';
import { AbstractModel } from './abstract_model';

@Injectable()
export class UGMModel extends AbstractModel {

    public _method_get: string = 'pageuser.getListByUser';
    public cache_model_prefix: string = 'ugm.';
    public cache_list_name: string = 'ugm.ids';

    constructor(  public api: Api ){
        super( api );
    }

    _buildGetParams( ids ): any{
        return { user_id: ids, type: 'group', state: 'member'};
    }
}