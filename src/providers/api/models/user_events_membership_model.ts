import { Injectable } from '@angular/core';
import { Api } from '../services/api.provider';
import { AbstractModel } from './abstract_model';

@Injectable()
export class UEMModel extends AbstractModel {

    constructor(  public api: Api ){
        super( {
            cache_model_prefix: 'uem.',
            cache_list_name: 'uem.ids',
            _method_get: 'pageuser.getListByUser',
        }, api );
    }

    _buildGetParams( ids ): any{
        return { user_id: ids, type: 'event', state: 'member'};
    }

}