/// <reference types="agent" />
import { EntryModuleDesktop } from './entry-module-inner-desktop';
import { EntryModuleCloud } from './entry-module-inner-cloud';
import { PromiseResult } from '../shared/generic-types';
export declare const rexCloudAgentModuleName = "Tirex";
export type RexCloudAgentModule = (EntryModuleDesktop | EntryModuleCloud) & TICloudAgent.Module;
export type AgentMode = 'desktop' | 'cloud';
type RexCloudAgentModuleMethodsOnly = Omit<RexCloudAgentModule, 'ENTRY_MODULE_TYPE'>;
type EntryModuleDesktopMethodsOnly = Omit<EntryModuleDesktop, 'ENTRY_MODULE_TYPE'>;
type EntryModuleCloudMethodsOnly = Omit<EntryModuleCloud, 'ENTRY_MODULE_TYPE'>;
export type AgentResponse<T extends keyof RexCloudAgentModuleMethodsOnly> = ReturnType<RexCloudAgentModule[T]>;
export type AgentResponseDesktop<T extends keyof EntryModuleDesktopMethodsOnly> = ReturnType<EntryModuleDesktop[T]>;
export type AgentResponseCloud<T extends keyof EntryModuleCloudMethodsOnly> = ReturnType<EntryModuleCloud[T]>;
export type AgentResult<T extends keyof RexCloudAgentModuleMethodsOnly> = PromiseResult<AgentResponse<T>>;
export type AgentResultDesktop<T extends keyof EntryModuleDesktopMethodsOnly> = PromiseResult<AgentResponseDesktop<T>>;
export type AgentResultCloud<T extends keyof EntryModuleCloudMethodsOnly> = PromiseResult<AgentResponseCloud<T>>;
export {};
