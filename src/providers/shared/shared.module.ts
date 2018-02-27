
import { NgModule, ModuleWithProviders } from '@angular/core';

// Services
import { WebSocket } from './websocket/websocket.provider';
import { UsersStatus } from './user_status/user_status.provider';
import { SoundsManager } from './sounds/sounds.provider';

// Directives
import { UserStatusDirective } from './user_status/user_status.directive';

@NgModule({
    declarations:[
        UserStatusDirective
    ],
    exports:[
        UserStatusDirective
    ]
})
export class SharedModule {
    static forRoot(): ModuleWithProviders {
        return {
            ngModule: SharedModule,
            providers: [
                WebSocket,
                UsersStatus,
                SoundsManager
            ]
        }
    }
}

export {
    WebSocket,
    UsersStatus,
    SoundsManager
};
