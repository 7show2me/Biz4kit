import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@Biz4kit/ui/components/empty";

import { screenById } from "@/lib/screens";

// Placeholder for a locked prototype screen (D94). The page is routed and sits inside the
// shell; the package that owns it fills it in.
export function StubScreen({ id }: { id: string }) {
  const screen = screenById(id);
  if (!screen) {
    throw new Error(`Unknown screen "${id}"`);
  }
  return (
    <div className="tab:p-page p-4" data-screen={id}>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{screen.name}</EmptyTitle>
          <EmptyDescription>
            Screen stub. The design is locked in design/app (screen id {id}).
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
