import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Dialogos } from "./dialogos";

@Component({ selector: "app-root", imports: [RouterOutlet, Dialogos], changeDetection: ChangeDetectionStrategy.OnPush, template: `<router-outlet /><pv-dialogos />` })
export class App {}
