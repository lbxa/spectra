import type { ReactNode } from "react";

type WorkspaceShellProps = {
  sidebar: ReactNode;
  stage: ReactNode;
};

export function WorkspaceShell({ sidebar, stage }: WorkspaceShellProps) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {sidebar}
      {stage}
    </div>
  );
}
