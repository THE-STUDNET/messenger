import { Injectable } from '@angular/core';
import { Api } from '../services/api.provider';
import { AbstractModel } from './abstract_model';

@Injectable()
export class UEMModel extends AbstractModel {

    public _method_get: string = 'pageuser.getListByUser';
    public cache_model_prefix: string = 'uem.';
    public cache_list_name: string = 'uem.ids';

    constructor(  public api: Api ){
        super( api );
    }

    _buildGetParams( ids ): any{
        return { user_id: ids, type: 'event', state: 'member'};
    }
}