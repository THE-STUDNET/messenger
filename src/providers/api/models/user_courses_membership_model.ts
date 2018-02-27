import { Injectable } from '@angular/core';
import { Api } from '../services/api.provider';
import { AbstractModel } from './abstract_model';

@Injectable()
export class UCMModel extends AbstractModel {

    constructor(  public api: Api ){
        super( {
            cache_model_prefix: 'ucm.',
            cache_list_name: 'ucm.ids',
            _method_get: 'pageuser.getListByUser',
        }, api );
    }

    _buildGetParams( ids ): any{
        return { user_id: ids, type: 'course', state: 'member'};
    }

}